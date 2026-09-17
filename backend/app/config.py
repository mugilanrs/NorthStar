from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "NorthStar"
    debug: bool = False
    secret_key: str = "change-me-in-production"

    # Database
    database_url: str

    # Redis (Upstash)
    upstash_redis_rest_url: str
    upstash_redis_rest_token: str

    # Grafana Cloud
    grafana_otlp_endpoint: str
    grafana_otlp_auth: str  # Base64 encoded instanceId:token
    grafana_api_token: str
    grafana_instance_id: str = "1833895"
    grafana_region: str = "ap-south-1"

    @property
    def grafana_prometheus_url(self) -> str:
        return f"https://prometheus-prod-{self.grafana_region}.grafana.net/api/prom"

    @property
    def grafana_loki_url(self) -> str:
        return f"https://logs-prod-{self.grafana_region}.grafana.net"

    @property
    def grafana_tempo_url(self) -> str:
        return f"https://tempo-prod-{self.grafana_region}.grafana.net"

    # Groq
    groq_api_key: str

    # CORS
    allowed_origins: list[str] = ["http://localhost:3000", "https://*.vercel.app"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
