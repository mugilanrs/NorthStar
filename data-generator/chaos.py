"""Chaos mode state machine. Thread-safe singleton."""
import threading

_lock = threading.Lock()

MODES = {
    "payment_degradation": {
        "payment-service": {"error_rate": 0.70, "latency_ms": 4000},
    },
    "inventory_storm": {
        "inventory-service": {"error_rate": 0.05, "latency_ms": 800},
    },
    "notification_crash": {
        "notification-service": {"error_rate": 1.0, "latency_ms": 10000, "drop": True},
    },
    "cascade_failure": {
        "payment-service": {"error_rate": 0.70, "latency_ms": 4000},
        "inventory-service": {"error_rate": 0.05, "latency_ms": 800},
    },
}

_active_mode: str | None = None
_overrides: dict = {}


def set_mode(mode: str) -> dict:
    global _active_mode, _overrides
    with _lock:
        if mode == "stop":
            _active_mode = None
            _overrides = {}
            return {"mode": None, "overrides": {}}
        if mode not in MODES:
            raise ValueError(f"Unknown chaos mode: {mode}")
        _active_mode = mode
        _overrides = MODES[mode]
        return {"mode": _active_mode, "overrides": _overrides}


def get_overrides() -> dict:
    with _lock:
        return dict(_overrides)


def get_active_mode() -> str | None:
    with _lock:
        return _active_mode
