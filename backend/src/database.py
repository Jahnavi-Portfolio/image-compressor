import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, Boolean, Integer
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from src.config import settings

db_url = settings.database_url
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)
if db_url == "${{Postgres.DATABASE_URL}}" or not db_url or "://" not in db_url:
    # Use a 'data' folder so users can mount a Railway Volume to /app/data to prevent data loss
    import os
    data_dir = os.path.join(os.getcwd(), "data")
    os.makedirs(data_dir, exist_ok=True)
    # SQLAlchemy requires an extra slash for absolute paths on Windows sometimes, but using a relative path like sqlite:///data/apiKeys.db works universally.
    db_url = "sqlite:///data/apiKeys.db"

engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class APIKey(Base):
    __tablename__ = "apiKeys"
    id = Column(String, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    machineId = Column(String, nullable=False)
    isActive = Column(Boolean, default=True)
    createdAt = Column(String, nullable=False)
    rate_limit = Column(Integer, default=60)
    usage_count = Column(Integer, default=0)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_api_key_record(db: Session, api_key: str):
    return db.query(APIKey).filter(APIKey.key == api_key).first()

def is_api_key_valid(db: Session, api_key: str) -> bool:
    record = get_api_key_record(db, api_key)
    return bool(record and record.isActive)

def get_api_keys(db: Session):
    return db.query(APIKey).order_by(APIKey.createdAt.asc()).all()

def create_api_key(db: Session, api_key: dict):
    new_key = APIKey(**api_key)
    db.add(new_key)
    db.commit()
    db.refresh(new_key)
    return new_key

def update_api_key(db: Session, id: str, is_active: bool = None, rate_limit: int = None):
    key_to_update = db.query(APIKey).filter(APIKey.id == id).first()
    if key_to_update:
        if is_active is not None:
            key_to_update.isActive = is_active
        if rate_limit is not None:
            key_to_update.rate_limit = rate_limit
        db.commit()
    return key_to_update

def delete_api_key(db: Session, id: str):
    key_to_delete = db.query(APIKey).filter(APIKey.id == id).first()
    if key_to_delete:
        db.delete(key_to_delete)
        db.commit()
    return key_to_delete

# Initialize the database and table on startup
# init_db()
