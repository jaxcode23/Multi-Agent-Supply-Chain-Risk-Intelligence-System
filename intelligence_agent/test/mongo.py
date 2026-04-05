from datetime import datetime
from intelligence_agent.infrastructure.mongo.base import get_mongo_client

def test_connection():
    try:
        # 1. Connect
        client = get_mongo_client()
        db = client["test_db"]  # Creates a temp database
        collection = db["connection_test"]

        # 2. Insert Data
        sample_data = {
            "test_run": "connectivity_check",
            "timestamp": datetime.now(),
            "user": "Developer"
        }
        print("1. Attempting Insert...")
        insert_result = collection.insert_one(sample_data)
        print(f"   Success! Document ID: {insert_result.inserted_id}")

        # 3. Read Data
        print("2. Attempting Read...")
        retrieved_doc = collection.find_one({"_id": insert_result.inserted_id})
        print(f"   Success! Retrieved: {retrieved_doc}")

        # 4. Clean Up (Optional: Delete the test data)
        print("3. Cleaning up...")
        collection.delete_one({"_id": insert_result.inserted_id})
        print("   Test document deleted.")

        print("\n✅ MongoDB connection is fully operational (Read/Write).")

    except Exception as e:
        print(f"\n❌ Test Failed: {e}")

if __name__ == "__main__":
    test_connection()