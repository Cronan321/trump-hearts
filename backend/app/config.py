from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:Butterfly254899974@localhost:5432/trump_hearts"
    SECRET_KEY: str = "supersecretkey123trumphearts"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS — accepts JSON array or comma-separated string
    ALLOWED_ORIGINS: str = "https://trumphearts-g3phnjde6-cronan321s-projects.vercel.app/"

    def get_allowed_origins(self) -> list[str]:
        raw = self.ALLOWED_ORIGINS.strip()
        if raw.startswith("["):
            import json
            return json.loads(raw)
        return [o.strip() for o in raw.split(",") if o.strip()]


settings = Settings()
