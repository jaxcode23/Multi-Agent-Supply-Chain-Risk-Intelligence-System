import logging
import pymongo
from intelligence_agent.infrastructure.mongo.base import get_mongo_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DB_SETUP")

def setup_database_indexes():
    """
    Runs once to configure the MongoDB collection with:
    1. Unique Constraints (prevent duplicates)
    2. Performance Indexes (speed up queries)
    3. TTL Indexes (auto-delete old data)
    """
    client = get_mongo_client()
    db = client["intelligence_db"]
    collection = db["raw_intel"]

    logger.info("🔌 Connected to MongoDB. Applying indexes...")

    # 1. UNIQUE INDEX on _id (Already default in Mongo, but good to verify)
    # We rely on our manual hash for this, so this is just a safety check.
    
    # 2. PRIORITY FILTER (Composite Index)
    # Usage: "Find me all HIGH priority items from the last 24 hours"
    # This makes that query instant.
    collection.create_index([
        ("analysis.priority", pymongo.ASCENDING),
        ("ingested_at", pymongo.DESCENDING)
    ], name="idx_priority_time")
    logger.info("✅ Created Priority+Time Index")

    # 3. DEDUPLICATION FALLBACK
    # If we ever query by URL directly instead of hash
    collection.create_index("url", unique=True, name="idx_unique_url")
    logger.info("✅ Created Unique URL Index")

    # 4. TTL (Time To Live) - AUTOMATIC CLEANUP
    # Automatically delete news older than 30 days to save space.
    # 30 days * 24 hrs * 60 mins * 60 secs = 2,592,000 seconds
    collection.create_index(
        "ingested_at", 
        expireAfterSeconds=2592000,
        name="idx_auto_cleanup"
    )
    logger.info("✅ Created 30-Day TTL Cleanup Index")

    print("\n🎉 Database setup complete! Your schema is optimized.")

if __name__ == "__main__":
    setup_database_indexes()