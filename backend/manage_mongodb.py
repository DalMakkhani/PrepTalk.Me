#!/usr/bin/env python3
"""
MongoDB Atlas Management Script for PrepTalk
This script helps you:
1. Check current database and collections
2. Clean up dummy/test data
3. Initialize proper schema for your project
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

def connect_to_mongodb():
    """Connect to MongoDB Atlas"""
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("❌ MONGO_URI not found in environment variables!")
        return None, None
    
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("✅ Successfully connected to MongoDB Atlas!")
        return client, client["preptalk"]
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return None, None

def show_database_status(client, db):
    """Show current database status"""
    print("\n" + "="*50)
    print("📊 CURRENT DATABASE STATUS")
    print("="*50)
    
    # List all databases
    print("\n🗃️  All Databases:")
    for db_info in client.list_databases():
        print(f"   - {db_info['name']} ({db_info.get('sizeOnDisk', 0) / 1024 / 1024:.2f} MB)")
    
    # Show preptalk database collections
    print(f"\n📁 Collections in 'preptalk' database:")
    collections = db.list_collection_names()
    if collections:
        for collection_name in collections:
            count = db[collection_name].count_documents({})
            print(f"   - {collection_name}: {count} documents")
    else:
        print("   No collections found (database is empty)")
    
    return collections

def show_sample_data(db, collections):
    """Show sample data from each collection"""
    print("\n" + "="*50)
    print("📄 SAMPLE DATA")
    print("="*50)
    
    for collection_name in collections:
        print(f"\n📋 Sample from '{collection_name}':")
        sample_docs = list(db[collection_name].find().limit(3))
        if sample_docs:
            for i, doc in enumerate(sample_docs, 1):
                print(f"   {i}. {doc}")
        else:
            print("   No documents found")

def clean_database(db):
    """Clean all collections in the database"""
    print("\n" + "="*50)
    print("🧹 CLEANING DATABASE")
    print("="*50)
    
    collections = db.list_collection_names()
    if not collections:
        print("✅ Database is already empty!")
        return
    
    print(f"Found {len(collections)} collections to clean:")
    for collection_name in collections:
        count_before = db[collection_name].count_documents({})
        result = db[collection_name].delete_many({})
        print(f"   - {collection_name}: Deleted {result.deleted_count} documents (was {count_before})")
    
    print("✅ Database cleaned successfully!")

def initialize_schema(db):
    """Initialize the proper schema for PrepTalk"""
    print("\n" + "="*50)
    print("🏗️  INITIALIZING PREPTALK SCHEMA")
    print("="*50)
    
    # Create users collection with sample structure
    users_collection = db["users"]
    print("📁 Creating 'users' collection...")
    
    # Create interviews collection with sample structure  
    interviews_collection = db["interviews"]
    print("📁 Creating 'interviews' collection...")
    
    # Create indexes for better performance
    try:
        # Index on username for faster user lookups
        users_collection.create_index("username", unique=True)
        print("   ✅ Created unique index on 'username'")
        
        # Index on user_id and timestamp for interviews
        interviews_collection.create_index("user_id")
        interviews_collection.create_index("timestamp")
        print("   ✅ Created indexes on 'user_id' and 'timestamp'")
        
    except Exception as e:
        print(f"   ⚠️  Index creation note: {e}")
    
    print("✅ Schema initialized successfully!")

def main():
    """Main function"""
    print("🚀 PrepTalk MongoDB Management Tool")
    print("="*50)
    
    # Connect to MongoDB
    client, db = connect_to_mongodb()
    if not client:
        return
    
    # Show current status
    collections = show_database_status(client, db)
    
    # Show sample data if exists
    if collections:
        show_sample_data(db, collections)
        
        # Ask user what to do
        print("\n" + "="*50)
        print("🤔 WHAT WOULD YOU LIKE TO DO?")
        print("="*50)
        print("1. Clean all data and start fresh")
        print("2. Keep existing data")
        print("3. Just show status (no changes)")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == "1":
            confirm = input("⚠️  Are you SURE you want to delete ALL data? Type 'YES' to confirm: ")
            if confirm == "YES":
                clean_database(db)
                initialize_schema(db)
            else:
                print("❌ Operation cancelled")
        elif choice == "2":
            print("✅ Keeping existing data")
            initialize_schema(db)
        else:
            print("✅ No changes made")
    else:
        print("\n✅ Database is empty - initializing fresh schema...")
        initialize_schema(db)
    
    # Show final status
    print("\n" + "="*50)
    print("🎉 FINAL STATUS")
    print("="*50)
    show_database_status(client, db)
    
    client.close()
    print("\n✅ MongoDB management completed!")

if __name__ == "__main__":
    main()
