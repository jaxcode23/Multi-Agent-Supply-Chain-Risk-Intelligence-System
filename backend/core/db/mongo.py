from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

# ---------- MongoDB ----------
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URI or not DB_NAME:
    raise RuntimeError("MONGO_URI and DB_NAME must be set in environment")

mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client[DB_NAME]
news_collection = mongo_db["processed_news"]
