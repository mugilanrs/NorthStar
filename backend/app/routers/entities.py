from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.models.observability import Entity

router = APIRouter(prefix="/entities", tags=["entities"])


class EntityOut(BaseModel):
    id: UUID
    entity_type: str
    name: str
    namespace: str | None
    cluster: str | None
    cloud_provider: str | None
    cloud_region: str | None
    labels: dict
    health_status: str
    last_seen_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[EntityOut])
async def list_entities(
    entity_type: str | None = None,
    health_status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Entity).order_by(Entity.name)
    if entity_type:
        q = q.where(Entity.entity_type == entity_type)
    if health_status:
        q = q.where(Entity.health_status == health_status)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{entity_id}", response_model=EntityOut)
async def get_entity(entity_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Entity).where(Entity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.post("/discover", status_code=202)
async def trigger_discovery(background_tasks: BackgroundTasks):
    """Manually trigger entity discovery (no Celery needed for dev)."""
    from app.workers.entity_discovery import discover_entities, evaluate_entity_health
    background_tasks.add_task(discover_entities.apply)
    background_tasks.add_task(evaluate_entity_health.apply)
    return {"message": "Discovery triggered"}


@router.get("/{entity_id}/health-history")
async def entity_health_history(entity_id: UUID, db: AsyncSession = Depends(get_db)):
    """Returns the last 24h of health_status changes from activity_logs."""
    result = await db.execute(
        text("""
            SELECT created_at, details
            FROM activity_logs
            WHERE details->>'entity_id' = :eid
              AND event_type = 'health_status_changed'
            ORDER BY created_at DESC
            LIMIT 100
        """),
        {"eid": str(entity_id)},
    )
    rows = result.fetchall()
    return [{"timestamp": r[0], "details": r[1]} for r in rows]
