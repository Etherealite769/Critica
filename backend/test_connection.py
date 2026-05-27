from db_connection import get_db_handle

def verify_data():
    db, client = get_db_handle()
    
    # 1. Create a collection and insert a document
    collection = db['test_collection']
    test_doc = {"name": "Test User", "status": "Connected"}
    
    # Insert the document
    result = collection.insert_one(test_doc)
    print(f"Inserted document ID: {result.inserted_id}")
    
    # 2. Read it back to verify
    found_doc = collection.find_one({"name": "Test User"})
    print(f"Retrieved document from DB: {found_doc}")

if __name__ == "__main__":
    verify_data()