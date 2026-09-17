"""Async client for Grafana Cloud Prometheus (query + metadata APIs)."""
import httpx
from app.config import get_settings

settings = get_settings()

_AUTH = (settings.grafana_instance_id, settings.grafana_api_token)
_BASE = settings.grafana_prometheus_url  # e.g. https://prometheus-prod-ap-south-1.grafana.net/api/prom


async def instant_query(promql: str, timeout: int = 10) -> dict:
    """Execute a PromQL instant query. Returns raw Grafana response."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(
            f"{_BASE}/api/v1/query",
            params={"query": promql},
            auth=_AUTH,
        )
        r.raise_for_status()
        return r.json()


async def range_query(promql: str, start: str, end: str, step: str = "60s", timeout: int = 15) -> dict:
    """Execute a PromQL range query for charting."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(
            f"{_BASE}/api/v1/query_range",
            params={"query": promql, "start": start, "end": end, "step": step},
            auth=_AUTH,
        )
        r.raise_for_status()
        return r.json()


async def label_values(label: str, match: str | None = None, timeout: int = 10) -> list[str]:
    """Fetch all values for a label (e.g. all service_names)."""
    params: dict = {}
    if match:
        params["match[]"] = match
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(
            f"{_BASE}/api/v1/label/{label}/values",
            params=params,
            auth=_AUTH,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("data", [])


def instant_query_sync(promql: str, timeout: int = 10) -> dict:
    """Synchronous version for use inside Celery tasks."""
    with httpx.Client(timeout=timeout) as client:
        r = client.get(
            f"{_BASE}/api/v1/query",
            params={"query": promql},
            auth=_AUTH,
        )
        r.raise_for_status()
        return r.json()


def label_values_sync(label: str, match: str | None = None, timeout: int = 10) -> list[str]:
    """Synchronous label values fetch for Celery tasks."""
    params: dict = {}
    if match:
        params["match[]"] = match
    with httpx.Client(timeout=timeout) as client:
        r = client.get(
            f"{_BASE}/api/v1/label/{label}/values",
            params=params,
            auth=_AUTH,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("data", [])
