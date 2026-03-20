"""
MongoDB database connection manager.
"""
import logging
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, PyMongoError

logger = logging.getLogger("database")

# Global database instance
_client: AsyncIOMotorClient = None
_db: AsyncIOMotorDatabase = None


async def connect_to_database(uri: str, db_name: str = "vobiz_calls") -> AsyncIOMotorDatabase:
    """
    Connect to MongoDB and return the database instance.
    
    Args:
        uri: MongoDB connection URI
        db_name: Name of the database to use
        
    Returns:
        AsyncIOMotorDatabase instance
    """
    global _client, _db
    
    try:
        logger.info(f"Connecting to MongoDB...")
        server_selection_timeout_ms = int(os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "5000"))
        connect_timeout_ms = int(os.getenv("MONGODB_CONNECT_TIMEOUT_MS", "5000"))
        socket_timeout_ms = int(os.getenv("MONGODB_SOCKET_TIMEOUT_MS", "5000"))
        _client = AsyncIOMotorClient(
            uri,
            serverSelectionTimeoutMS=server_selection_timeout_ms,
            connectTimeoutMS=connect_timeout_ms,
            socketTimeoutMS=socket_timeout_ms,
        )
        
        # Verify connection
        await _client.admin.command('ping')
        logger.info("MongoDB connection successful!")
        
        _db = _client[db_name]
        
        # Create indexes
        await _create_indexes(_db)
        
        return _db
        
    except (ConnectionFailure, PyMongoError) as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def _create_indexes(db: AsyncIOMotorDatabase):
    """Create necessary indexes for the calls collection."""
    calls = db.calls
    
    # Index for call_id lookups (sparse so null values don't conflict)
    await calls.create_index("call_id", unique=True, sparse=True)
    
    # Index for phone number queries
    await calls.create_index("phone_number")
    
    # Index for status filtering
    await calls.create_index("status")
    
    # Index for date range queries
    await calls.create_index("created_at")
    
    logger.info("Database indexes created")


async def close_database_connection():
    """Close the MongoDB connection."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """Get the current database instance."""
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_to_database() first.")
    return _db


# Alias for convenience
db = get_database
