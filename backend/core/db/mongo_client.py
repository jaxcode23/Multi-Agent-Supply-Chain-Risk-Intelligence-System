from pymongo import MongoClient
from dotenv import load_dotenv
import os
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# ---------- MongoDB ----------
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("MONGO_DB_NAME", os.getenv("DB_NAME"))

_client = None


def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        if not MONGO_URI or not DB_NAME:
            raise RuntimeError("MONGO_URI and MONGO_DB_NAME must be set in environment")
        _client = MongoClient(MONGO_URI)
        logger.info(f"Connected to MongoDB: {DB_NAME}")
    return _client


def get_news_collection():
    return get_mongo_client()[DB_NAME]["processed_news"]
