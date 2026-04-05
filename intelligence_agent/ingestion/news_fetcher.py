import os
import logging
from datetime import datetime, timedelta
import requests # type: ignore
from dotenv import load_dotenv
from pymongo.errors import DuplicateKeyError
from pydantic import ValidationError

# --- Internal Imports ---
from intelligence_agent.infrastructure.mongo.base import get_mongo_client
from intelligence_agent.intelligence_logic.risk_scoring import calculate_intel_risk
from intelligence_agent.intelligence_logic.planner import should_escalate, assign_priority

# NEW: Import the Pydantic Models
from intelligence_agent.db.model.models import IntelDocument, IntelAnalysis

load_dotenv()
logger = logging.getLogger(__name__)

NEWS_API_URL = "https://newsapi.org/v2/everything"
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

def _fetch_from_api():
    """Private helper: Just gets the raw data."""
    if not NEWS_API_KEY:
        logger.error("Missing NEWS_API_KEY")
        return []

    # Window: Last 20 mins to catch anything in the 15-min gap + buffer
    time_window = datetime.utcnow() - timedelta(minutes=20)
    
    params = {
        "q": " OR ".join(["fire", "strike", "shutdown", "riot", "conflict"]),
        "language": "en",
        "from": time_window.isoformat(),
        "sortBy": "publishedAt",
        "pageSize": 50,
        "apiKey": NEWS_API_KEY
    }

    try:
        response = requests.get(NEWS_API_URL, params=params, timeout=10)
        response.raise_for_status()
        return response.json().get("articles", [])
    except Exception as e:
        logger.error(f"API Request failed: {e}")
        return []

def run_ingestion_cycle():
    """Main public function called by the Cron Job."""
    client = get_mongo_client()
    db = client["intelligence_db"]
    collection = db["raw_intel"]

    logger.info("Starting ingestion cycle...")
    articles = _fetch_from_api()
    new_count = 0

    for article in articles:
        # 1. Basic content check
        url = article.get("url")
        if not url: continue
        
        # 2. Risk Scoring
        title = article.get("title", "")
        desc = article.get("description", "") or ""
        full_text = f"{title} {desc}"
        
        score = calculate_intel_risk(full_text)
        if score == 0: continue  # Skip noise

        # 3. Create Pydantic Model (Validation & Hash Generation happen here)
        try:
            doc_model = IntelDocument(
                url=url,
                title=title,
                description=desc,
                raw_text=full_text,
                # Pydantic automatically parses the ISO date string from NewsAPI
                published_at=article.get("publishedAt"),
                
                analysis=IntelAnalysis(
                    risk_score=score,
                    priority=assign_priority(score),
                    escalate_to_analysis=should_escalate(score)
                )
            )

            # 4. Insert into Mongo
            # .to_mongo() converts the model to a dict and includes the computed _id hash
            collection.insert_one(doc_model.to_mongo())
            
            new_count += 1
            if doc_model.analysis.escalate_to_analysis:
                logger.warning(f"🚨 HIGH RISK DETECTED: {title}")

        except ValidationError as e:
            # This catches data issues (e.g. invalid date format from API)
            logger.error(f"Skipping invalid article: {e}")
            continue
            
        except DuplicateKeyError:
            # This handles the _id collision (Article already exists)
            pass 

    logger.info(f"Cycle done. Ingested {new_count} new articles.")