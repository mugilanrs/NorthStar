"""Async client for Grafana Cloud Tempo via the Grafana datasource proxy.

Proxying through mightytortoise1690.grafana.net avoids needing a separate
traces:read scoped token — the datasource already has the right credentials.
"""
import httpx
from app.config import get_settings

settings = get_settings()

# Proxy URL: Grafana instance relays to Tempo with its own credentials.
_GRAFANA_URL = "https://mightytortoise1690.grafana.net"
_DS_UID = "grafanacloud-traces"
_PROXY_BASE = f"{_GRAFANA_URL}/api/datasources/proxy/uid/{_DS_UID}"
_HEADERS = {"Authorization": f"Bearer {settings.grafana_api_token}"}


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
            f"{_PROXY_BASE}/api/search",
            params=params,
            headers=_HEADERS,
        )
        r.raise_for_status()
        return r.json()


async def get_trace(trace_id: str, timeout: int = 15) -> dict:
    """Fetch full trace (all spans) by hex trace ID."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(
            f"{_PROXY_BASE}/api/traces/{trace_id}",
            headers={**_HEADERS, "Accept": "application/json"},
        )
        r.raise_for_status()
        return r.json()
