import sys
import os
import logging
from datetime import datetime, timedelta
from pymongo.errors import DuplicateKeyError

# --- PATH HACK (To run from root) ---
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
# ------------------------------------

from intelligence_agent.infrastructure.mongo.base import get_mongo_client
from intelligence_agent.db.model.models import IntelDocument, IntelAnalysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SEEDER")

# --- FAKE INTELLIGENCE DATA ---
DUMMY_SCENARIOS = [
    {
        "title": "Major Chemical Explosion at Industrial Zone B",
        "description": "A massive blast has been reported at the PetroChem facility. Toxic smoke visible for miles. Evacuation ordered.",
        "url": "https://fake-news.com/chemical-explosion-2024",
        "risk_score": 5,
        "priority": "high",
        "escalate": True,
        "offset_mins": 5 # Happened 5 mins ago
    },
    {
        "title": "Nationwide Transport Strike Announced",
        "description": "Union leaders have declared a total shutdown of rail and bus services starting tomorrow due to wage disputes.",
        "url": "https://fake-news.com/transport-strike-update",
        "risk_score": 3,
        "priority": "medium",
        "escalate": True,
        "offset_mins": 30
    },
    {
        "title": "Minor Fire at Local Bakery Extinguished",
        "description": "Firefighters quickly put out a small kitchen fire. No injuries reported.",
        "url": "https://fake-news.com/bakery-fire-incident",
        "risk_score": 1,
        "priority": "low",
        "escalate": False,
        "offset_mins": 120
    },
    {
        "title": "Annual Safety Drill Conducted",
        "description": "The city conducted its scheduled earthquake readiness drill today.",
        "url": "https://fake-news.com/safety-drill-2024",
        "risk_score": 0,
        "priority": "low",
        "escalate": False,
        "offset_mins": 200
    }
]

def seed_database():
    client = get_mongo_client()
    db = client["intelligence_db"]
    collection = db["raw_intel"]

    logger.info("🌱 Seeding database with dummy intel...")
    
    count = 0
    
    for scenario in DUMMY_SCENARIOS:
        try:
            # 1. Instantiate the Model (Validate Data)
            # Note: We simulate 'published_at' relative to now
            doc = IntelDocument(
                url=scenario["url"],
                title=scenario["title"],
                description=scenario["description"],
                raw_text=f"{scenario['title']} {scenario['description']}",
                published_at=datetime.utcnow() - timedelta(minutes=scenario["offset_mins"]),
                
                analysis=IntelAnalysis(
                    risk_score=scenario["risk_score"],
                    priority=scenario["priority"],
                    escalate_to_analysis=scenario["escalate"]
                )
            )

            # 2. Insert into Mongo (Model converts to dict)
            collection.insert_one(doc.to_mongo())
            count += 1
            logger.info(f" -> Inserted: [{scenario['priority'].upper()}] {scenario['title']}")

        except DuplicateKeyError:
            logger.warning(f" -> Skipped (Duplicate): {scenario['title']}")
        except Exception as e:
            logger.error(f" -> Failed: {e}")

    logger.info(f"✅ Seeding Complete. Added {count} documents.")

if __name__ == "__main__":
    seed_database()