"""
Pre-built golden signal PromQL queries per entity type.
Each query uses {service_name="{name}"} to scope to a specific entity.
"""

# Time range placeholder — callers substitute actual start/end/step
GOLDEN_SIGNALS: dict[str, list[dict]] = {
    "service": [
        {
            "id": "request_rate",
            "label": "Request Rate",
            "unit": "req/s",
            "promql": 'sum(rate(http_server_duration_milliseconds_count{{service_name="{name}"}}[5m]))',
            "color": "#22D3EE",
        },
        {
            "id": "error_rate",
            "label": "Error Rate",
            "unit": "%",
            "promql": (
                '100 * sum(rate(http_server_duration_milliseconds_count{{service_name="{name}",http_status_code=~"5.."}}[5m]))'
                ' / sum(rate(http_server_duration_milliseconds_count{{service_name="{name}"}}[5m]))'
            ),
            "color": "#EF4444",
        },
        {
            "id": "p50_latency",
            "label": "p50 Latency",
            "unit": "ms",
            "promql": (
                'histogram_quantile(0.50, sum by (le)'
                '(rate(http_server_duration_milliseconds_bucket{{service_name="{name}"}}[5m])))'
            ),
            "color": "#22C55E",
        },
        {
            "id": "p99_latency",
            "label": "p99 Latency",
            "unit": "ms",
            "promql": (
                'histogram_quantile(0.99, sum by (le)'
                '(rate(http_server_duration_milliseconds_bucket{{service_name="{name}"}}[5m])))'
            ),
            "color": "#F59E0B",
        },
        {
            "id": "active_requests",
            "label": "Active Requests",
            "unit": "",
            "promql": 'sum(http_server_active_requests{{service_name="{name}"}})',
            "color": "#A78BFA",
        },
    ],
    "database": [
        {
            "id": "query_latency_p99",
            "label": "Query Latency p99",
            "unit": "ms",
            "promql": (
                'histogram_quantile(0.99, sum by (le)'
                '(rate(inventory_query_latency_ms_bucket{{service_name="{name}"}}[5m])))'
            ),
            "color": "#F59E0B",
        },
    ],
}

# Fallback for unknown types — use generic http metrics
GOLDEN_SIGNALS["host"] = GOLDEN_SIGNALS["service"]
GOLDEN_SIGNALS["pod"] = GOLDEN_SIGNALS["service"]
GOLDEN_SIGNALS["container"] = GOLDEN_SIGNALS["service"]


def get_golden_signals(entity_type: str, entity_name: str) -> list[dict]:
    templates = GOLDEN_SIGNALS.get(entity_type, GOLDEN_SIGNALS["service"])
    return [
        {**t, "promql": t["promql"].format(name=entity_name)}
        for t in templates
    ]
