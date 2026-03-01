#!/usr/bin/env python
"""
Simple MongoDB Atlas connection test
"""
import os
from pymongo import MongoClient

def test_mongodb_connection():
    """Test MongoDB Atlas connection directly"""
    print("=== Testing MongoDB Atlas Connection ===")
    
    # Your connection string (replace password)
    connection_string = "mongodb+srv://acrepairing21:<acrepairing21>@cluster786.eu651.mongodb.net/?appName=Cluster786"
    
    # Replace placeholder with actual password
    password = input("Enter your MongoDB password: ")
    connection_string = connection_string.replace("<acrepairing21>", password)
    
    try:
        # Connect to MongoDB Atlas
        client = MongoClient(connection_string)
        
        # Test the connection
        client.admin.command('ping')
        print("✅ MongoDB Atlas connected successfully!")
        
        # List databases
        databases = client.list_database_names()
        print(f"📁 Available databases: {databases}")
        
        # Test database operations
        db = client.ac_refrigeration
        test_collection = db.test_connection
        
        # Insert a test document
        result = test_collection.insert_one({"test": "connection", "timestamp": "2025-03-01"})
        print(f"✅ Test document inserted: {result.inserted_id}")
        
        # Query the test document
        doc = test_collection.find_one({"test": "connection"})
        print(f"✅ Test document retrieved: {doc}")
        
        # Clean up
        test_collection.delete_one({"test": "connection"})
        print("✅ Test document cleaned up")
        
        client.close()
        print("✅ Connection closed successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ MongoDB Atlas connection failed!")
        print(f"   Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_mongodb_connection()
    if success:
        print("\n🎉 MongoDB Atlas is working correctly!")
    else:
        print("\n❌ MongoDB Atlas connection issues detected")
