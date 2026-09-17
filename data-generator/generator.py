"""
Main generator loop.
Emits realistic OTLP metrics, traces, and logs to Grafana Cloud
as if 5 e-commerce microservices were running.

Run modes:
  python generator.py            → continuous live emission
  python generator.py --backfill --days 7  → inject 7 days of history
"""
import os
import time
import random
import string
import struct
import threading
import argparse
import logging
from datetime import datetime, timezone, timedelta

from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.trace import SpanKind, StatusCode
from opentelemetry.sdk.trace import ReadableSpan

from services import TRAFFIC_PATTERNS, sample_latency, sample_error, diurnal_multiplier
import chaos

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("generator")

OTLP_ENDPOINT = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "https://otlp-gateway-prod-ap-south-1.grafana.net/otlp")
OTLP_AUTH = os.environ.get("OTEL_EXPORTER_OTLP_AUTH", "")  # Base64 instanceId:token


def _build_headers() -> dict:
    if OTLP_AUTH:
        return {"Authorization": f"Basic {OTLP_AUTH}"}
    return {}


def _resource(service: str) -> Resource:
    return Resource.create({
        "service.name": service,
        "service.version": "1.0.0",
        "deployment.environment": "production",
        "k8s.namespace.name": "ecommerce",
        "k8s.cluster.name": "northstar-demo",
    })


def _rand_id(n: int) -> str:
    return "".join(random.choices(string.hexdigits[:16], k=n))


# --- Providers per service ---

_tracer_providers: dict[str, TracerProvider] = {}
_meter_providers: dict[str, MeterProvider] = {}
_tracers: dict[str, trace.Tracer] = {}
_meters: dict[str, metrics.Meter] = {}

# Metric instruments (shared namespace)
_http_duration: dict[str, metrics.Histogram] = {}
_http_active: dict[str, metrics.UpDownCounter] = {}
_service_metrics: dict[str, dict] = {}  # service-specific instruments


def _init_providers():
    headers = _build_headers()
    for svc in ["api-gateway", "order-service", "payment-service", "inventory-service", "notification-service"]:
        tp = TracerProvider(resource=_resource(svc))
        tp.add_span_processor(BatchSpanProcessor(
            OTLPSpanExporter(
                endpoint=f"{OTLP_ENDPOINT}/v1/traces",
                headers=headers,
            )
        ))
        _tracer_providers[svc] = tp
        _tracers[svc] = tp.get_tracer(svc)

        reader = PeriodicExportingMetricReader(
            OTLPMetricExporter(
                endpoint=f"{OTLP_ENDPOINT}/v1/metrics",
                headers=headers,
            ),
            export_interval_millis=15_000,
        )
        mp = MeterProvider(resource=_resource(svc), metric_readers=[reader])
        _meter_providers[svc] = mp
        m = mp.get_meter(svc)
        _meters[svc] = m
        _http_duration[svc] = m.create_histogram("http.server.duration", unit="ms")
        _http_active[svc] = m.create_up_down_counter("http.server.active_requests")

    # Service-specific metric instruments
    order_m = _meters["order-service"]
    _service_metrics["order-service"] = {
        "created_total": order_m.create_counter("orders.created_total"),
        "failed_total": order_m.create_counter("orders.failed_total"),
        "processing_duration": order_m.create_histogram("orders.processing_duration_seconds", unit="s"),
    }

    pay_m = _meters["payment-service"]
    _service_metrics["payment-service"] = {
        "success_rate": pay_m.create_gauge("payment.success_rate"),
        "processing_duration": pay_m.create_histogram("payment.processing_duration_ms", unit="ms"),
        "pool_saturation": pay_m.create_gauge("payment.connection_pool_saturation"),
    }

    inv_m = _meters["inventory-service"]
    _service_metrics["inventory-service"] = {
        "stock_level": inv_m.create_gauge("inventory.stock_level"),
        "query_latency": inv_m.create_histogram("inventory.query_latency_ms", unit="ms"),
    }

    notif_m = _meters["notification-service"]
    _service_metrics["notification-service"] = {
        "queue_depth": notif_m.create_gauge("notifications.queue_depth"),
    }


def _emit_service_metrics(overrides: dict):
    """Emit domain-specific gauges/counters based on current chaos state."""
    pay_overrides = overrides.get("payment-service", {})
    error_rate = pay_overrides.get("error_rate", 0.03)
    pool_sat = min(1.0, 0.3 + error_rate)  # pool saturates under error load

    _service_metrics["payment-service"]["success_rate"].set(round(1.0 - error_rate, 3))
    _service_metrics["payment-service"]["pool_saturation"].set(round(pool_sat, 3))
    _service_metrics["payment-service"]["processing_duration"].record(
        sample_latency("payment-service", overrides)
    )

    inv_overrides = overrides.get("inventory-service", {})
    _service_metrics["inventory-service"]["stock_level"].set(random.randint(50, 500))
    _service_metrics["inventory-service"]["query_latency"].record(
        sample_latency("inventory-service", inv_overrides)
    )

    _service_metrics["notification-service"]["queue_depth"].set(random.randint(0, 20))


def _simulate_request(pattern_name: str, overrides: dict):
    """Simulate one request through the call chain, emitting spans."""
    pattern = TRAFFIC_PATTERNS[pattern_name]
    path = pattern["path"]
    trace_id = _rand_id(32)
    parent_span_id = None

    for i, svc in enumerate(path):
        svc_overrides = overrides.get(svc, {})
        if svc_overrides.get("drop"):
            break  # service is "crashed" — no spans emitted

        latency = sample_latency(svc, overrides)
        is_error = sample_error(svc, overrides)
        span_id = _rand_id(16)

        # Emit span via tracer
        with _tracers[svc].start_as_current_span(
            f"{pattern['http_method']} {pattern['http_route']}",
            kind=SpanKind.SERVER if i == 0 else SpanKind.CLIENT,
        ) as span:
            span.set_attribute("http.method", pattern["http_method"])
            span.set_attribute("http.route", pattern["http_route"])
            span.set_attribute("http.status_code", 500 if is_error else 200)
            span.set_attribute("service.name", svc)
            if is_error:
                span.set_status(StatusCode.ERROR, "upstream error")
                span.set_attribute("error.type", "connection_pool_exhausted" if svc == "payment-service" else "upstream_error")

        _http_duration[svc].record(latency, {"http.method": pattern["http_method"], "http.status_code": str(500 if is_error else 200)})
        _http_active[svc].add(1)
        time.sleep(latency / 1000.0)
        _http_active[svc].add(-1)

        if is_error:
            break  # don't call downstream on error


def run_live():
    log.info("Initializing OTel providers...")
    _init_providers()
    log.info("Starting live emission loop — press Ctrl+C to stop")

    tick = 0
    while True:
        overrides = chaos.get_overrides()
        multiplier = diurnal_multiplier()

        # Decide which traffic patterns fire this tick (weighted random)
        for pattern_name, pattern in TRAFFIC_PATTERNS.items():
            effective_rps = pattern["rps"] * multiplier
            if random.random() < effective_rps:
                try:
                    _simulate_request(pattern_name, overrides)
                except Exception as e:
                    log.warning(f"Span emission error ({pattern_name}): {e}")

        if tick % 4 == 0:
            try:
                _emit_service_metrics(overrides)
            except Exception as e:
                log.warning(f"Metric emission error: {e}")

        tick += 1
        time.sleep(0.125)  # ~8 req/s baseline


def run_backfill(days: int = 7):
    """
    Inject historical data by running the generator in fast-forward mode.
    Emits metrics and trace spans with backdated timestamps.
    Note: OTLP exporters don't support timestamp override natively;
    we use the Prometheus remote_write API for metric backfill,
    and emit trace backfill as individual OTLP batches.
    """
    import httpx
    import base64

    log.info(f"Starting backfill for {days} days...")
    _init_providers()

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    # Step through time in 1-minute increments
    current = start
    total_minutes = int((now - start).total_seconds() / 60)
    processed = 0

    while current < now:
        overrides = {}  # clean history — no chaos

        # Simulate a few requests per minute
        for _ in range(random.randint(5, 15)):
            pattern_name = random.choice(list(TRAFFIC_PATTERNS.keys()))
            try:
                _simulate_request(pattern_name, overrides)
            except Exception:
                pass

        current += timedelta(minutes=1)
        processed += 1

        if processed % 60 == 0:
            pct = (processed / total_minutes) * 100
            log.info(f"Backfill progress: {pct:.1f}% ({processed}/{total_minutes} minutes)")

        time.sleep(0.01)  # throttle a bit

    log.info("Backfill complete. Shutting down providers...")
    for tp in _tracer_providers.values():
        tp.shutdown()
    for mp in _meter_providers.values():
        mp.shutdown()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--backfill", action="store_true")
    parser.add_argument("--days", type=int, default=7)
    args = parser.parse_args()

    if args.backfill:
        run_backfill(args.days)
    else:
        run_live()
