# Komute Image Compression Microservice
## Enterprise Architecture Documentation

This service has been upgraded from a basic FastAPI script to a resilient, production-ready microservice capable of handling high-throughput corporate traffic without degrading.

### 1. Security & Load Shedding
* **Decompression Bomb Protection**: Pillow strictly limits processing to 50 Megapixels.
* **Graceful Load Shedding**: Integrated `psutil` monitors server CPU usage. If CPU hits > 85%, lower-priority requests are immediately rejected with a `503 Service Unavailable`, guaranteeing the API container does not crash under massive viral spikes.
* **EXIF Metadata Stripping**: The application inherently strips EXIF data from all uploaded images, preventing unintended leaks of GPS locations or hardware metadata from user photographs.

### 2. Memory & Performance Optimizations
* **Memory-Mapped Streaming**: Instead of buffering 15MB uploads directly into RAM (which would cause OOM kills under load), the API streams payloads to a temporary disk location in 8KB chunks. Pillow then lazily memory-maps the file, keeping the RAM footprint nearly perfectly flat regardless of concurrent connections.
* **Worker Starvation Timeouts**: Gunicorn is configured with a strict 10-second timeout. Any processing job that gets "stuck" due to extreme image complexity is automatically killed and recycled to prevent starving other users.
* **Edge Caching via CDN**: Response headers inject `Cache-Control: public, max-age=31536000, immutable`. If placed behind Cloudflare, identical requests will be served in <5ms with 0 compute overhead on Railway.

### 3. Telemetry & DevOps
* **Healthcheck Engine**: A `/health` endpoint performs active polling against the PostgreSQL database to verify real-time operability. If the connection drops, Railway is signaled to reboot the container.
* **Structured JSON Telemetry**: Every successful request emits a JSON log payload containing `latency_ms`, `original_size`, and `saved_bytes`. This allows seamless integration into DataDog/Kibana to monitor exactly how much bandwidth the microservice is saving the company in real-time.
