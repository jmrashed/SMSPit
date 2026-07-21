from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8001
    cors_origin: str = "*"
    otel_exporter_otlp_endpoint: str | None = None


settings = Settings()
