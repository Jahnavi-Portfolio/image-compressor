import io
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Header, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone
import jwt
import os
import time
from sqlalchemy.orm import Session
from sqlalchemy import text

# Import everything from the new database module
from src.database import (
    get_api_key_record,
    is_api_key_valid,
    get_api_keys,
    create_api_key,
    update_api_key,
    delete_api_key,
    get_db,
    init_db
)
from PIL import Image
import pillow_avif

app = FastAPI(title="Komute Image Compression Service - Simple")

from sqlalchemy.exc import OperationalError

# Initialize the database on startup
@app.on_event("startup")
def on_startup():
    retries = 5
    while retries > 0:
        try:
            init_db()
            print("Database connection successful.")
            break
        except OperationalError:
            print("Database connection failed. Retrying...")
            retries -= 1
            time.sleep(5)
    if retries == 0:
        print("Could not connect to the database. Exiting.")
        exit(1)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limiting dict
key_requests = {}

def check_rate_limit(api_key: str, limit: int) -> bool:
    now = time.time()
    if api_key not in key_requests:
        key_requests[api_key] = []
    # Keep only timestamps within last 60 seconds
    key_requests[api_key] = [t for t in key_requests[api_key] if now - t < 60]
    if len(key_requests[api_key]) >= limit:
        return False
    key_requests[api_key].append(now)
    return True

def verify_api_key(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    api_key = x_api_key
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.split(" ")[1]

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key required"
        )

    record = get_api_key_record(db, api_key)
    if not record or not record.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or inactive API Key"
        )
        
    if not check_rate_limit(api_key, record.rate_limit):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment."
        )
        
    record.usage_count += 1
    db.commit()
    
    return api_key

# --- SECURITY: Prevent Decompression Bomb Attacks ---
# A malicious user could upload a tiny 1KB zip-bomb image that expands to 100GB in memory, crashing the server.
# This strictly caps image processing to ~50 Megapixels (e.g. 7000x7000)
Image.MAX_IMAGE_PIXELS = 50_000_000

@app.post("/api/v1/compress")
def compress_image(
    compressionPercentage: int = Form(80),
    format: str = Form("webp"),
    file: UploadFile = File(...),
    api_key: str = Depends(verify_api_key)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    # --- SECURITY: Max File Size Validation ---
    MAX_FILE_SIZE = 15 * 1024 * 1024 # 15 MB limit to prevent network congestion
    file_bytes = file.file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 15MB.")

    out_format = format.lower()
    if out_format not in ("webp", "avif"):
        out_format = "webp"

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            quality = max(1, min(100, 100 - compressionPercentage))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGBA")

            output_buffer = io.BytesIO()
            img.save(output_buffer, format=out_format, optimize=True, quality=quality)
            compressed_data = output_buffer.getvalue()

        media_type = f"image/{out_format}"
        filename = file.filename or "image"
        filename = filename.rsplit(".", 1)[0]

        headers = {
            "Content-Disposition": f'attachment; filename="compressed_{filename}.{out_format}"',
            "Cache-Control": "public, max-age=31536000"
        }
        return Response(content=compressed_data, media_type=media_type, headers=headers)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- DEVOPS: Health Check Endpoint for Railway ---
@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Verify DB connection is alive
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Service Unavailable: Database down")

# Models
class LoginRequest(BaseModel):
    password: str

class KeyCreateRequest(BaseModel):
    name: str
    rate_limit: int = 60

class KeyUpdateRequest(BaseModel):
    isActive: Optional[bool] = None
    rate_limit: Optional[int] = None

# Admin Authentication
DASHBOARD_PASSWORD = os.getenv("DASHBOARD_PASSWORD", "admin")
DASHBOARD_SECRET = os.getenv("DASHBOARD_SECRET", "default_secret")

def verify_admin(request: Request):
    token = request.cookies.get("auth_token")
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        jwt.decode(token, DASHBOARD_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.post("/api/auth/login")
async def login(req: LoginRequest, response: Response):
    if req.password != DASHBOARD_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

    token = jwt.encode({"admin": True}, DASHBOARD_SECRET, algorithm="HS256")
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        max_age=60*60*24,
        samesite="lax"
    )
    return {"success": True}

@app.get("/api/keys")
async def get_keys_endpoint(request: Request, db: Session = Depends(get_db)):
    verify_admin(request)
    keys = get_api_keys(db)
    return {"keys": keys}

@app.post("/api/keys")
async def create_key_endpoint(req: KeyCreateRequest, request: Request, db: Session = Depends(get_db)):
    verify_admin(request)
    new_key_data = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "key": "sk_test_" + str(uuid.uuid4()).replace("-", ""),
        "machineId": "server",
        "isActive": True,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "rate_limit": req.rate_limit,
        "usage_count": 0
    }
    new_key = create_api_key(db, new_key_data)
    # Manually convert to dict to avoid issues with SQLAlchemy's internal state
    key_dict = {c.name: getattr(new_key, c.name) for c in new_key.__table__.columns}
    return JSONResponse(status_code=201, content=key_dict)


@app.put("/api/keys/{key_id}")
async def update_key_endpoint(key_id: str, req: KeyUpdateRequest, request: Request, db: Session = Depends(get_db)):
    verify_admin(request)
    update_api_key(db, key_id, req.isActive, req.rate_limit)
    return {"success": True}

@app.delete("/api/keys/{key_id}")
async def delete_key_endpoint(key_id: str, request: Request, db: Session = Depends(get_db)):
    verify_admin(request)
    delete_api_key(db, key_id)
    return {"message": "Deleted"}

# Serve static frontend files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
