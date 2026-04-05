import time
import logging
import schedule
import sys
import os

# --- Path Hack (Optional but helpful for running directly) ---
# Adds the project root to sys.path so imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
# -------------------------------------------------------------

from intelligence_agent.ingestion.news_fetcher import run_ingestion_cycle

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Scheduler")

def job():
    try:
        run_ingestion_cycle()
    except Exception as e:
        logger.error(f"Job crashed: {e}")

if __name__ == "__main__":
    logger.info("Scheduler initialized. Running every 15 minutes.")
    
    # 1. Run immediately on startup (so you don't wait 15m to see if it works)
    job()
    
    # 2. Schedule the loop
    schedule.every(15).minutes.do(job)

    while True:
        schedule.run_pending()
        time.sleep(1)