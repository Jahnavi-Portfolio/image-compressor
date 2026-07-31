from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    api_key_secret: str = "komute-verification-secret"
    database_url: str = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/imagedb")

    class Config:
        env_file = ".env"

settings = Settings()
