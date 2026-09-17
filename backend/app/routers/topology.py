from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.observability import Entity, TopologyEdge

router = APIRouter(prefix="/topology", tags=["topology"])


class TopologyNode(BaseModel):
    id: str
    name: str
    entity_type: str
    health_status: str
    error_rate: Optional[float] = None
    p99_ms: Optional[float] = None


class TopologyEdgeOut(BaseModel):
    id: str
    source_id: str
    target_id: str
    source: str
    target: str
    edge_type: Optional[str] = None
    call_count: int
    error_rate: Optional[float] = None
    avg_latency_ms: Optional[float] = None


class TopologyResponse(BaseModel):
    nodes: list[TopologyNode]
    edges: list[TopologyEdgeOut]


@router.get("", response_model=TopologyResponse)
async def get_topology(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    entities_result = await db.execute(
        select(Entity).where(Entity.entity_type == "service").order_by(Entity.name)
    )
    entity_list = entities_result.scalars().all()

    edges_result = await db.execute(select(TopologyEdge))
    edge_list = edges_result.scalars().all()

    # Auto-seed topology edges when entities exist but edges don't yet
    if entity_list and not edge_list:
        from app.workers.entity_discovery import discover_topology_edges
        background_tasks.add_task(discover_topology_edges.apply)

    entity_map = {str(e.id): e for e in entity_list}

    nodes = [
        TopologyNode(
            id=str(e.id),
            name=e.name,
            entity_type=e.entity_type,
            health_status=e.health_status,
            error_rate=e.labels.get("error_rate") if e.labels else None,
            p99_ms=e.labels.get("p99_ms") if e.labels else None,
        )
        for e in entity_list
    ]

    edges = []
    for edge in edge_list:
        src = entity_map.get(str(edge.source_entity))
        tgt = entity_map.get(str(edge.target_entity))
        if src and tgt:
            edges.append(TopologyEdgeOut(
                id=str(edge.id),
                source_id=str(edge.source_entity),
                target_id=str(edge.target_entity),
                source=src.name,
                target=tgt.name,
                edge_type=edge.edge_type,
                call_count=edge.call_count,
                error_rate=edge.error_rate,
                avg_latency_ms=edge.avg_latency_ms,
            ))

    return TopologyResponse(nodes=nodes, edges=edges)


@router.post("/seed", status_code=202)
async def seed_topology(background_tasks: BackgroundTasks):
    """Trigger topology edge discovery from known service graph."""
    from app.workers.entity_discovery import discover_topology_edges
    background_tasks.add_task(discover_topology_edges.apply)
    return {"message": "Topology discovery triggered"}
