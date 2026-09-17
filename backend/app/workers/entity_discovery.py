"""
EntityDiscoveryWorker  — runs every 30s via Celery beat.
Queries Grafana Cloud Prometheus for unique service labels
and upserts them into the `entities` table.

EntityHealthEvaluator  — runs every 30s via Celery beat.
Evaluates error rate + p99 latency per service and writes
health_status (healthy / degraded / critical) to entities.
"""
import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.celery_app import celery
from app.config import get_settings
from app.services.prometheus import instant_query_sync, label_values_sync

log = logging.getLogger(__name__)
settings = get_settings()

# Synchronous SQLAlchemy engine for Celery (asyncpg doesn't work in sync context)
_db_url = settings.database_url.replace(
    "postgresql://", "postgresql+psycopg2://"
).replace("postgres://", "postgresql+psycopg2://")
_engine = create_engine(_db_url, pool_pre_ping=True)

# Entity type inference: if service name contains these keywords → type
_TYPE_HINTS = {
    "db": "database", "database": "database", "postgres": "database",
    "mysql": "database", "redis": "database", "mongo": "database",
    "pod": "pod", "node": "host",
    "gateway": "service", "api": "service",
}


def _infer_type(name: str) -> str:
    lower = name.lower()
    for keyword, entity_type in _TYPE_HINTS.items():
        if keyword in lower:
            return entity_type
    return "service"


@celery.task(name="app.workers.entity_discovery.discover_entities", bind=True, max_retries=3)
def discover_entities(self):
    """Fetch unique service_name labels from Prometheus and upsert into entities."""
    try:
        # OTel Collector translates service.name → service_name in Prometheus labels
        service_names = label_values_sync(
            "service_name",
            match='http_server_duration_milliseconds_count',
        )
        if not service_names:
            # Fallback: try job label (some OTel configs use job=service_name)
            service_names = label_values_sync("job")

        if not service_names:
            log.warning("No service labels found in Grafana Cloud Prometheus yet")
            return {"discovered": 0}

        now = datetime.now(timezone.utc)
        upserted = 0

        with Session(_engine) as session:
            for name in service_names:
                # Check if entity already exists
                row = session.execute(
                    text("SELECT id FROM entities WHERE name = :name AND entity_type = :etype"),
                    {"name": name, "etype": _infer_type(name)},
                ).fetchone()

                if row:
                    session.execute(
                        text("UPDATE entities SET last_seen_at = :now WHERE id = :id"),
                        {"now": now, "id": row[0]},
                    )
                else:
                    session.execute(
                        text("""
                            INSERT INTO entities (id, entity_type, name, namespace, cluster, labels, health_status, last_seen_at, created_at)
                            VALUES (:id, :etype, :name, :ns, :cluster, :labels::jsonb, 'unknown', :now, :now)
                        """),
                        {
                            "id": str(uuid.uuid4()),
                            "etype": _infer_type(name),
                            "name": name,
                            "ns": "ecommerce",   # from OTel resource attribute
                            "cluster": "northstar-demo",
                            "labels": '{"source": "otel"}',
                            "now": now,
                        },
                    )
                    upserted += 1

            session.commit()

        log.info(f"Entity discovery: {len(service_names)} seen, {upserted} new")
        return {"discovered": len(service_names), "new": upserted}

    except Exception as exc:
        log.error(f"Entity discovery failed: {exc}")
        raise self.retry(exc=exc, countdown=10)


# Health thresholds
_ERROR_RATE_DEGRADED = 0.05   # 5%
_ERROR_RATE_CRITICAL = 0.20   # 20%
_P99_DEGRADED_MS = 500
_P99_CRITICAL_MS = 2000


def _compute_health(error_rate: float, p99_ms: float) -> str:
    if error_rate >= _ERROR_RATE_CRITICAL or p99_ms >= _P99_CRITICAL_MS:
        return "critical"
    if error_rate >= _ERROR_RATE_DEGRADED or p99_ms >= _P99_DEGRADED_MS:
        return "degraded"
    return "healthy"


@celery.task(name="app.workers.entity_discovery.evaluate_entity_health", bind=True, max_retries=3)
def evaluate_entity_health(self):
    """
    For each known service entity, query:
      - error rate = sum(rate(http_server_duration_ms_count{status="500"}[5m])) / sum(rate(...[5m]))
      - p99 latency from histogram
    Then write health_status back to entities.
    """
    try:
        # Error rate per service (5-min window)
        # OTel http.status_code label becomes http_status_code in Prometheus
        error_query = """
            sum by (service_name) (
                rate(http_server_duration_milliseconds_count{http_status_code=~"5.."}[5m])
            )
            /
            sum by (service_name) (
                rate(http_server_duration_milliseconds_count[5m])
            )
        """
        # p99 latency per service
        p99_query = """
            histogram_quantile(0.99,
                sum by (service_name, le) (
                    rate(http_server_duration_milliseconds_bucket[5m])
                )
            )
        """

        error_result = instant_query_sync(error_query)
        p99_result = instant_query_sync(p99_query)

        # Build lookup maps: service_name → value
        error_map: dict[str, float] = {}
        for item in error_result.get("data", {}).get("result", []):
            svc = item["metric"].get("service_name", "")
            val = item["value"][1] if item.get("value") else "0"
            try:
                error_map[svc] = float(val)
            except (ValueError, TypeError):
                error_map[svc] = 0.0

        p99_map: dict[str, float] = {}
        for item in p99_result.get("data", {}).get("result", []):
            svc = item["metric"].get("service_name", "")
            val = item["value"][1] if item.get("value") else "0"
            try:
                p99_map[svc] = float(val)
            except (ValueError, TypeError):
                p99_map[svc] = 0.0

        now = datetime.now(timezone.utc)
        updated = 0

        with Session(_engine) as session:
            rows = session.execute(
                text("SELECT id, name FROM entities WHERE entity_type = 'service'")
            ).fetchall()

            for entity_id, name in rows:
                error_rate = error_map.get(name, 0.0)
                p99_ms = p99_map.get(name, 0.0)
                health = _compute_health(error_rate, p99_ms)

                session.execute(
                    text("""
                        UPDATE entities
                        SET health_status = :health, last_seen_at = :now,
                            labels = labels || :extra::jsonb
                        WHERE id = :id
                    """),
                    {
                        "health": health,
                        "now": now,
                        "id": entity_id,
                        "extra": f'{{"error_rate": {error_rate:.4f}, "p99_ms": {p99_ms:.1f}}}',
                    },
                )
                updated += 1

            session.commit()

        log.info(f"Entity health evaluated: {updated} services updated")
        return {"updated": updated, "error_map": error_map, "p99_map": p99_map}

    except Exception as exc:
        log.error(f"Entity health evaluation failed: {exc}")
        raise self.retry(exc=exc, countdown=10)
