"""Per-service latency distributions and error profiles."""
import random

SERVICES = {
    "api-gateway": {
        "base_latency_ms": (20, 60),   # (min, max) uniform sample
        "p99_latency_ms": 150,
        "error_rate": 0.01,
        "downstream": ["order-service", "inventory-service"],
    },
    "order-service": {
        "base_latency_ms": (30, 80),
        "p99_latency_ms": 200,
        "error_rate": 0.02,
        "downstream": ["payment-service", "inventory-service", "notification-service"],
    },
    "payment-service": {
        "base_latency_ms": (50, 150),
        "p99_latency_ms": 400,
        "error_rate": 0.03,
        "downstream": [],
    },
    "inventory-service": {
        "base_latency_ms": (15, 50),
        "p99_latency_ms": 120,
        "error_rate": 0.01,
        "downstream": [],
    },
    "notification-service": {
        "base_latency_ms": (10, 40),
        "p99_latency_ms": 100,
        "error_rate": 0.02,
        "downstream": [],
    },
}

TRAFFIC_PATTERNS = {
    "browse_products": {
        "rps": 0.7,
        "path": ["api-gateway", "inventory-service"],
        "http_method": "GET",
        "http_route": "/products",
    },
    "view_order": {
        "rps": 0.25,
        "path": ["api-gateway", "order-service"],
        "http_method": "GET",
        "http_route": "/orders/{id}",
    },
    "checkout": {
        "rps": 0.13,
        "path": ["api-gateway", "order-service", "payment-service", "inventory-service", "notification-service"],
        "http_method": "POST",
        "http_route": "/checkout",
    },
}


def sample_latency(service: str, chaos_overrides: dict | None = None) -> float:
    """Returns latency in ms for a service, respecting chaos overrides."""
    if chaos_overrides and service in chaos_overrides:
        return chaos_overrides[service].get("latency_ms", 800.0)
    lo, hi = SERVICES[service]["base_latency_ms"]
    return random.uniform(lo, hi)


def sample_error(service: str, chaos_overrides: dict | None = None) -> bool:
    """Returns True if this span should be an error."""
    if chaos_overrides and service in chaos_overrides:
        return random.random() < chaos_overrides[service].get("error_rate", 0.03)
    return random.random() < SERVICES[service]["error_rate"]


def diurnal_multiplier() -> float:
    """Simulates realistic traffic variation: peaks at top-of-hour."""
    import time
    t = time.time()
    minute = (t % 3600) / 60  # 0-60
    if minute < 5:
        return 2.5
    if minute < 35 and minute > 25:
        return 1.8
    return 1.0
