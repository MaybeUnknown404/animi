import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "AnimiStream FastAPI Service"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    APP_DIR: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: Path = APP_DIR / "data"

    # Upstream Live API Base & Endpoints (Configurable via .env or environment variables)
    UPSTREAM_API_BASE: str = os.getenv("UPSTREAM_API_BASE", "https://pencarinafkah.xyz/vA6/api")
    UPSTREAM_API_KEY: str = os.getenv("UPSTREAM_API_KEY", "cda11y63tfI7rwln8BLeiKTvjsD5g2Mox01RzkhQCEXSGWbqYO")
    UPSTREAM_POPULAR_URL: str = os.getenv("UPSTREAM_POPULAR_URL", "")
    UPSTREAM_LATEST_URL: str = os.getenv("UPSTREAM_LATEST_URL", "")
    UPSTREAM_COMPLETE_URL: str = os.getenv("UPSTREAM_COMPLETE_URL", "")
    UPSTREAM_GENRES_URL: str = os.getenv("UPSTREAM_GENRES_URL", "")
    UPSTREAM_DETAIL_URL: str = os.getenv("UPSTREAM_DETAIL_URL", "")
    UPSTREAM_EPISODE_URL: str = os.getenv("UPSTREAM_EPISODE_URL", "")
    UPSTREAM_SEARCH_URL: str = os.getenv("UPSTREAM_SEARCH_URL", "")
    
    CORS_ORIGINS: list = ["*"]

settings = Settings()


