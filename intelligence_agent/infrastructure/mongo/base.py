import os
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env")

def get_mongo_client():
    uri = os.getenv("MONGO_URI")
    if not uri:
        raise RuntimeError("MONGO_URI not set")

    return MongoClient(
        uri,
        serverSelectionTimeoutMS=15000,
        connectTimeoutMS=15000,
        socketTimeoutMS=15000,
        tls=True,
        tlsAllowInvalidCertificates=False,
        retryWrites=True
    )
