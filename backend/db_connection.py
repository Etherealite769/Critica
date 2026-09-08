import os
from pymongo import MongoClient

# Use your connection string here
# It is highly recommended to use an environment variable for the password
MONGO_URI = "mongodb+srv://admin_user1:welcome1@cluster0.zswbjeh.mongodb.net/?appName=Cluster0"

def get_db_handle():
    client = MongoClient(MONGO_URI)
    # Replace 'my_database' with the name you want for your database
    db = client['CriticaDB'] 
    return db, client