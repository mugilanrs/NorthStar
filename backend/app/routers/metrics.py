"""
Metrics router — proxies PromQL to Grafana Cloud Prometheus.
All chart data flows through here so the frontend never holds Grafana credentials.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models.observability import Entity
from app.services import prometheus as prom
from app.services.golden_signals import get_golden_signals

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/query")
async def instant_query(q: str = Query(..., description="PromQL expression")):
    """Instant PromQL query — returns current value(s)."""
    try:
        return await prom.instant_query(q)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Prometheus query failed: {e}")


@router.get("/query_range")
async def range_query(
    q: str = Query(..., description="PromQL expression"),
    start: str = Query(..., description="RFC3339 or unix timestamp"),
    end: str = Query(..., description="RFC3339 or unix timestamp"),
    step: str = Query("60s", description="Resolution step"),
):
    """Range PromQL query — returns time-series data for charts."""
    try:
        return await prom.range_query(q, start, end, step)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Prometheus range query failed: {e}")


@router.get("/labels")
async def get_labels():
    """Returns all label names (for autocomplete)."""
    try:
        result = await prom.instant_query("group by (__name__) ({__name__=~\".+\"})")
        # Extract metric names from the result for autocomplete
        names = [r["metric"].get("__name__", "") for r in result.get("data", {}).get("result", [])]
        return {"metric_names": sorted(set(names))}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/label/{label_name}/values")
async def label_values(label_name: str, match: str | None = Query(None)):
    """Returns all values for a label — used for filter dropdowns."""
    try:
        values = await prom.label_values(label_name, match)
        return {"values": values}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Per-entity golden signals ──────────────────────────────────────────────

@router.get("/entity/{entity_id}/golden-signals")
async def entity_golden_signals(
    entity_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Returns the list of golden signal query definitions for this entity."""
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return get_golden_signals(entity.entity_type, entity.name)


@router.get("/entity/{entity_id}/golden-signals/{signal_id}")
async def entity_signal_data(
    entity_id: UUID,
    signal_id: str,
    start: str = Query(...),
    end: str = Query(...),
    step: str = Query("60s"),
    db: AsyncSession = Depends(get_db),
):
    """Execute one golden signal query and return chart-ready data."""
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    signals = get_golden_signals(entity.entity_type, entity.name)
    signal = next((s for s in signals if s["id"] == signal_id), None)
    if not signal:
        raise HTTPException(status_code=404, detail=f"Signal '{signal_id}' not found")

    try:
        data = await prom.range_query(signal["promql"], start, end, step)
        return {
            "signal": signal,
            "data": data,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
