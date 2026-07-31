# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This project is an image compression microservice.

- **Backend:** A Python [FastAPI](https://fastapi.tiangolo.com/) application located in the `backend/` directory.
  - `src/main.py`: The main application file. It defines two sets of endpoints:
    1.  `/api/v1/compress`: The core endpoint that accepts an image, a compression percentage, and a format (`webp` or `avif`), and returns the compressed image. It requires an API key for access.
    2.  `/api/auth/*` and `/api/keys/*`: A simple admin interface for managing API keys. This is protected by a simple password.
  - `src/database.py`: Handles all database operations for the API keys. It uses a **SQLite** database file (`apiKeys.db`).
  - `src/config.py`: Manages settings using `pydantic-settings`.

- **Frontend:** A basic static HTML/JavaScript frontend in the `frontend/` directory for managing API keys and testing the compression. It is served directly by the FastAPI backend.

- **Database:** A single SQLite file (`apiKeys.db`) in the root of the `backend/` directory stores API keys.

- **Containerization:** The application is containerized using Docker.
  - `backend/Dockerfile`: Defines the image for the backend service.
  - `docker-compose.yml`: Orchestrates running the backend service.

## Common Development Tasks

### Running the Application Locally

The easiest way to run the application is with Docker Compose.

```bash
docker-compose up --build
```

The API will be available at `http://localhost:8000`.
The admin dashboard is at `http://localhost:8000/`. The default password is "admin".

### Running Tests

There is a simple test script `test_api.py` that can be run to check if the API is working.

First, make sure the application is running. Then, in a separate terminal:

```bash
# Make sure you have requests and Pillow installed
pip install requests Pillow

# Run the test script
python test_api.py
```

## Key Limitations & Future Work

This application is a prototype and has several limitations that need to be addressed before it can be used in production.

1.  **Database Scalability:** The use of **SQLite is a major bottleneck**. It does not support concurrent writes well and will not scale to handle many simultaneous users. **The highest priority change is to migrate the database from SQLite to PostgreSQL or MySQL.**

2.  **Production Readiness:**
    - The Docker setup uses `--reload`, which is for development only. A production deployment should use a proper WSGI server like `gunicorn`.
    - There is no structured logging or monitoring, which is essential for debugging issues in production.

3.  **Security:**
    - The admin dashboard password defaults to a weak, hardcoded value. This should be a strong, configurable secret.
    - API keys are stored in plain text in the database. They should be hashed for better security.

4.  **Workflow Integration:** The API is designed to be called by other services. The primary integration pattern is for another application to receive an image upload, call this service's `/api/v1/compress` endpoint, and then store the returned compressed image. No changes are needed in this repository for this workflow, but the consuming application must implement this logic.
