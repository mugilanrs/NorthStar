import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, Float, Integer, BigInteger, Text, ForeignKey, TIMESTAMP, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # service|host|pod|container|database
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    namespace: Mapped[str | None] = mapped_column(String(255))
    cluster: Mapped[str | None] = mapped_column(String(255))
    cloud_provider: Mapped[str | None] = mapped_column(String(50))
    cloud_region: Mapped[str | None] = mapped_column(String(100))
    labels: Mapped[dict] = mapped_column(JSONB, default=dict)
    health_status: Mapped[str] = mapped_column(String(50), default="unknown")  # healthy|degraded|critical|unknown
    last_seen_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())


class TopologyEdge(Base):
    __tablename__ = "topology_edges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_entity: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("entities.id"))
    target_entity: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("entities.id"))
    edge_type: Mapped[str | None] = mapped_column(String(50))  # calls|depends_on|runs_on
    call_count: Mapped[int] = mapped_column(BigInteger, default=0)
    error_rate: Mapped[float | None] = mapped_column(Float)
    avg_latency_ms: Mapped[float | None] = mapped_column(Float)
    last_seen_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(50))
    metric_name: Mapped[str | None] = mapped_column(String(255))
    condition: Mapped[str | None] = mapped_column(String(50))  # gt|lt|anomaly
    threshold: Mapped[float | None] = mapped_column(Float)
    window_minutes: Mapped[int] = mapped_column(Integer, default=5)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)  # critical|high|medium|low
    promql: Mapped[str | None] = mapped_column(Text)
    auto_create_incident: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_incident_priority: Mapped[str | None] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("alert_rules.id"))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("entities.id"))
    source: Mapped[str] = mapped_column(String(100), nullable=False)  # rule|otel|webhook|anomaly_engine
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500))
    fingerprint: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="firing")  # firing|resolved|silenced
    incident_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    raw_payload: Mapped[dict | None] = mapped_column(JSONB)
    received_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))


class SyntheticCheck(Base):
    __tablename__ = "synthetic_checks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    method: Mapped[str] = mapped_column(String(10), default="GET")
    interval_seconds: Mapped[int] = mapped_column(Integer, default=60)
    timeout_ms: Mapped[int] = mapped_column(Integer, default=5000)
    expected_status: Mapped[int] = mapped_column(Integer, default=200)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())


class SyntheticResult(Base):
    __tablename__ = "synthetic_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    check_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("synthetic_checks.id"))
    status: Mapped[str | None] = mapped_column(String(50))  # up|down|timeout
    response_ms: Mapped[int | None] = mapped_column(Integer)
    http_status: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)
    checked_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
