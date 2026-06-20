import logging

logger = logging.getLogger(__name__)

SCRAPER_SOURCES = [
    "newsapi",
    "rss_feeds",
]


def get_active_sources() -> list[str]:
    return SCRAPER_SOURCES


def dispatch_scrape(source: str, query: str) -> dict | None:
    logger.info(f"Scrape dispatch requested: source={source}, query={query}")
    return None
