from typing import List, Optional, Any, Union
from pydantic import BaseModel, Field

class AnimeSummary(BaseModel):
    cid: int
    category_name: str
    category_image: Optional[str] = ""
    status_video: Optional[str] = "Unknown"
    rating: Optional[float] = 0.0
    year: Optional[int] = 2026
    genre: Optional[str] = ""
    desc_anime: Optional[str] = ""
    days: Optional[Union[str, int]] = ""
    total_views: Optional[int] = 0
    video_count: Optional[int] = 0
    new_date_time: Optional[str] = ""
    update_date_time: Optional[str] = ""
    latest_vid: Optional[int] = None
    latest_video_title: Optional[str] = None


class VideoStreamQuality(BaseModel):
    quality_360p: Optional[str] = None
    quality_480p: Optional[str] = None
    quality_720p: Optional[str] = None
    quality_1080p: Optional[str] = None
    quality_eng: Optional[str] = None
    quality_hdeng: Optional[str] = None

class EpisodeItem(BaseModel):
    vid: int
    cat_id: int
    video_title: str
    video_thumbnail: Optional[str] = ""
    video_duration: Optional[str] = ""
    date_time: Optional[str] = ""
    rating: Optional[float] = 0.0
    year: Optional[int] = 2026
    category_name: Optional[str] = ""
    genre: Optional[str] = ""
    streams: VideoStreamQuality

class AnimeDetailResponse(BaseModel):
    status: str = "ok"
    category: AnimeSummary
    episodes: List[EpisodeItem] = []
    total_episodes: int = 0

class PaginatedAnimeResponse(BaseModel):
    status: str = "ok"
    page: int = 1
    count: int = 0
    count_total: int = 0
    pages: int = 1
    items: List[AnimeSummary] = []

class GenreItem(BaseModel):
    id: int
    genre_anime: str

class APIStats(BaseModel):
    status: str = "ok"
    project_name: str
    version: str
    total_anime_titles: int
    total_episodes: int
    genres_count: int
    data_sources: List[str]
