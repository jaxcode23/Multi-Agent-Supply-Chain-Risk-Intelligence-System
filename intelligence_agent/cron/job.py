import signal
import time
import logging
import schedule

from intelligence_agent.logging_config import setup_logging
from intelligence_agent.health_server import start_health_server
from intelligence_agent.ingestion.news_fetcher import run_ingestion_cycle

setup_logging()
logger = logging.getLogger("Scheduler")

_shutdown = False


def _handle_signal(signum, frame):
    global _shutdown
    logger.info("Shutdown signal received - stopping scheduler")
    _shutdown = True


def job():
    try:
        run_ingestion_cycle()
    except Exception as e:
        logger.error("Job crashed: %s", e)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    health_server = start_health_server()

    logger.info("Scheduler initialized. Running every 15 minutes.")

    # Run immediately on startup
    job()

    # Schedule the loop
    schedule.every(15).minutes.do(job)

    while not _shutdown:
        schedule.run_pending()
        time.sleep(1)

    health_server.shutdown()
    logger.info("Scheduler stopped")