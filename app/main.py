from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.core.config import settings
from app.api.v1.endpoints.anime import router as anime_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="High performance FastAPI Service & Web Portal for Anime metadata, streaming episodes, search, and OpenAPI playground.",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files & Templates setup
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

STATIC_DIR.mkdir(parents=True, exist_ok=True)
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Register Routers
app.include_router(anime_router, prefix=f"{settings.API_V1_STR}/anime", tags=["Anime Service"])

@app.get("/", summary="Web Dashboard & Portal")
def root_dashboard(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"title": settings.PROJECT_NAME, "version": settings.PROJECT_VERSION}
    )

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME, "version": settings.PROJECT_VERSION}
