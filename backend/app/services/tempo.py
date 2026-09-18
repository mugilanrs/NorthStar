"""Async client for Grafana Cloud Tempo (distributed trace search + retrieval)."""
import httpx
from app.config import get_settings

settings = get_settings()

_AUTH = (settings.grafana_instance_id, settings.grafana_api_token)
_BASE = settings.grafana_tempo_url  # https://tempo-prod-ap-south-1.grafana.net


async def search_traces(
    service: str | None = None,
    status: str | None = None,
    min_duration: str | None = None,  # e.g. "100ms", "1s"
    limit: int = 20,
    start: int | None = None,  # unix seconds
    end: int | None = None,    # unix seconds
    timeout: int = 15,
) -> dict:
    """Search for traces using Tempo's tag-based search API."""
    params: dict[str, str | int] = {"limit": limit}

    tags_parts: list[str] = []
    if service:
        tags_parts.append(f"service.name={service}")
    if status in ("ok", "error", "unset"):
        tags_parts.append(f"status={status}")
    if tags_parts:
        params["tags"] = " ".join(tags_parts)

    if min_duration:
        params["minDuration"] = min_duration
    if start:
        params["start"] = start
    if end:
        params["end"] = end

    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(
            f"{_BASE}/api/search",
            params=params,
            auth=_AUTH,
        )
        r.raise_for_status()
        return r.json()


async def get_trace(trace_id: str, timeout: int = 15) -> dict:
    """Fetch full trace (all spans) by hex trace ID."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(
            f"{_BASE}/api/traces/{trace_id}",
            auth=_AUTH,
            headers={"Accept": "application/json"},
        )
        r.raise_for_status()
        return r.json()
