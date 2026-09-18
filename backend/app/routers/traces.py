"""
Traces router — proxies to Grafana Cloud Tempo and normalizes OTLP into a
flat span list the frontend waterfall can render directly.
"""
import base64
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from app.services import tempo

router = APIRouter(prefix="/traces", tags=["traces"])


# ── ID helpers ────────────────────────────────────────────────────────────────

def _decode_id(id_str: str) -> str:
    """Accept either a hex or base64-encoded span/trace ID; return lowercase hex."""
    if not id_str:
        return ""
    # All hex? Return as-is.
    try:
        int(id_str, 16)
        return id_str.lower()
    except ValueError:
        pass
    # Try base64 (OTLP proto-JSON encodes bytes as base64).
    try:
        decoded = base64.b64decode(id_str + "==")
        return decoded.hex()
    except Exception:
        return id_str


def _attr_value(v: dict) -> str:
    for key in ("stringValue", "intValue", "doubleValue", "boolValue"):
        if key in v:
            return str(v[key])
    return str(v)


def _status_code(code: int | str) -> Literal["ok", "error", "unset"]:
    try:
        c = int(code)
    except (TypeError, ValueError):
        return "unset"
    if c == 2:
        return "error"
    if c == 1:
        return "ok"
    return "unset"


# ── Response normalizers ──────────────────────────────────────────────────────

def _normalize_search_result(t: dict) -> dict:
    span_sets = t.get("spanSets", [])
    has_error = any(
        _status_code(s.get("status", {}).get("code", 0)) == "error"
        for ss in span_sets
        for s in ss.get("spans", [])
    )
    span_count = sum(ss.get("matched", len(ss.get("spans", []))) for ss in span_sets)

    return {
        "trace_id": t.get("traceID", ""),
        "root_service": t.get("rootServiceName", "unknown"),
        "root_name": t.get("rootTraceName", "unknown"),
        "start_ms": int(t.get("startTimeUnixNano", 0)) // 1_000_000,
        "duration_ms": int(t.get("durationMs", 0)),
        "status": "error" if has_error else "ok",
        "span_count": span_count,
    }


def _normalize_trace(raw: dict, trace_id: str) -> dict:
    spans: list[dict] = []

    for batch in raw.get("batches", []):
        resource_attrs: dict[str, str] = {
            a["key"]: _attr_value(a["value"])
            for a in batch.get("resource", {}).get("attributes", [])
        }
        service = resource_attrs.get("service.name", "unknown")

        for scope_span in batch.get("scopeSpans", []):
            for span in scope_span.get("spans", []):
                start_ns = int(span.get("startTimeUnixNano", 0))
                end_ns = int(span.get("endTimeUnixNano", 0))

                attrs: dict[str, str] = {
                    a["key"]: _attr_value(a["value"])
                    for a in span.get("attributes", [])
                }

                parent_raw = span.get("parentSpanId", "")
                parent_hex = _decode_id(parent_raw) if parent_raw else None

                spans.append({
                    "span_id": _decode_id(span.get("spanId", "")),
                    "parent_id": parent_hex or None,
                    "service": service,
                    "operation": span.get("name", ""),
                    "start_ms": start_ns // 1_000_000,
                    "duration_ms": max(0, (end_ns - start_ns) // 1_000_000),
                    "status": _status_code(span.get("status", {}).get("code", 0)),
                    "attributes": attrs,
                })

    if not spans:
        return {
            "trace_id": trace_id,
            "start_ms": 0,
            "duration_ms": 0,
            "service_count": 0,
            "spans": [],
        }

    min_start = min(s["start_ms"] for s in spans)
    max_end = max(s["start_ms"] + s["duration_ms"] for s in spans)

    return {
        "trace_id": trace_id,
        "start_ms": min_start,
        "duration_ms": max(max_end - min_start, 1),
        "service_count": len({s["service"] for s in spans}),
        "spans": sorted(spans, key=lambda s: s["start_ms"]),
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/search")
async def search(
    service: str | None = Query(None, description="Filter by service.name"),
    status: str | None = Query(None, description="ok | error | unset"),
    min_duration: str | None = Query(None, alias="minDuration", description="e.g. 100ms, 1s"),
    limit: int = Query(20, ge=1, le=100),
    start: int | None = Query(None, description="Unix epoch seconds"),
    end: int | None = Query(None, description="Unix epoch seconds"),
):
    """Search traces in Grafana Cloud Tempo."""
    try:
        raw = await tempo.search_traces(
            service=service,
            status=status,
            min_duration=min_duration,
            limit=limit,
            start=start,
            end=end,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tempo search failed: {e}")

    traces = [_normalize_search_result(t) for t in raw.get("traces", [])]
    return {"traces": traces}


@router.get("/{trace_id}")
async def get_trace(trace_id: str):
    """Fetch full span tree for a trace from Grafana Cloud Tempo."""
    try:
        raw = await tempo.get_trace(trace_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tempo fetch failed: {e}")

    return _normalize_trace(raw, trace_id)
