from celery import Celery
from celery.schedules import crontab
from app.config import get_settings

settings = get_settings()

# Derive standard Redis URL from Upstash REST URL
# REST URL: https://champion-hyena-283056.upstash.io
# Redis URL: rediss://default:{token}@champion-hyena-283056.upstash.io:6380
_host = settings.upstash_redis_rest_url.replace("https://", "")
REDIS_URL = f"rediss://default:{settings.upstash_redis_rest_token}@{_host}:6380"

celery = Celery(
    "northstar",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.workers.entity_discovery",
    ],
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    broker_use_ssl={"ssl_cert_reqs": None},
    redis_backend_use_ssl={"ssl_cert_reqs": None},
    beat_schedule={
        "discover-entities": {
            "task": "app.workers.entity_discovery.discover_entities",
            "schedule": 30.0,
        },
        "evaluate-entity-health": {
            "task": "app.workers.entity_discovery.evaluate_entity_health",
            "schedule": 30.0,
        },
        "discover-topology-edges": {
            "task": "app.workers.entity_discovery.discover_topology_edges",
            "schedule": 60.0,
        },
    },
)
