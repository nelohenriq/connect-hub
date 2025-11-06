# ConnectHub Video Verification Service

A high-performance Go service for video-based face verification with liveness detection and privacy-preserving storage.

## Features

- **Face Recognition**: Uses go-face library for accurate face detection and recognition
- **Liveness Detection**: Implements motion-based liveness verification
- **Privacy-Preserving**: Encrypted storage of face vectors using AES-GCM
- **Real-time Processing**: Optimized for <3 second processing times
- **REST API**: Clean HTTP API for integration with Next.js frontend
- **Docker Support**: Containerized deployment with docker-compose

## Architecture

```
┌─────────────────┐    HTTP    ┌──────────────────────┐
│   Next.js App   │────────────│  Go Verification     │
│                 │            │  Service (Port 8080) │
└─────────────────┘            └──────────────────────┘
                                      │
                                      │
                         ┌────────────┴────────────┐
                         │                         │
                ┌────────▼────────┐      ┌────────▼────────┐
                │ Face Detection │      │ Liveness        │
                │ & Recognition  │      │ Detection       │
                └───────────────┬┘      └─────────────────┘
                                │
                                │
                ┌───────────────▼─────────────────────────┐
                │ Privacy-Preserving Storage              │
                │ - Encrypted face vectors                │
                │ - Secure key derivation                 │
                └─────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Go 1.21+
- Docker & Docker Compose (for containerized deployment)

### Local Development

1. **Clone and setup:**
   ```bash
   cd services/verification
   go mod tidy
   ```

2. **Download face recognition models:**
   ```bash
   mkdir -p models
   # Download dlib face recognition models
   # Models should be placed in ./models directory
   ```

3. **Run the service:**
   ```bash
   go run main.go
   ```

4. **Test the API:**
   ```bash
   curl -X GET http://localhost:8080/health
   ```

### Docker Deployment

1. **Build and run:**
   ```bash
   docker-compose up --build
   ```

2. **Environment variables:**
   ```bash
   export ENCRYPTION_KEY=your-secure-key-here
   ```

## API Endpoints

### POST /api/v1/verify
Verify a video for liveness and face recognition.

**Request:**
- `video`: Video file (multipart/form-data)
- `user_id`: Optional user ID for duplicate checking

**Response:**
```json
{
  "success": true,
  "data": {
    "verification_id": "ver_1234567890",
    "verified": true,
    "confidence": 0.95,
    "liveness_score": 0.92,
    "processing_time": 1.8,
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

### POST /api/v1/register
Register a new face for future verification.

**Request:**
- `video`: Video file (multipart/form-data)
- `user_id`: Required user ID

### GET /api/v1/status/:id
Get verification status by ID.

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Service port |
| `FACE_MODEL_PATH` | ./models | Path to face recognition models |
| `LIVENESS_THRESHOLD` | 0.85 | Liveness detection threshold |
| `SIMILARITY_THRESHOLD` | 0.75 | Face similarity threshold |
| `STORAGE_PATH` | ./storage | Path for encrypted storage |
| `ENCRYPTION_KEY` | - | AES encryption key (required) |
| `MAX_CONCURRENT_REQUESTS` | 10 | Max concurrent processing requests |
| `PROCESSING_TIMEOUT` | 30 | Processing timeout in seconds |

## Security Features

- **Face Vector Encryption**: All stored face vectors are encrypted using AES-GCM
- **Key Derivation**: Uses scrypt for secure key derivation from passwords
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Input Validation**: Comprehensive validation of video files and parameters
- **CORS Protection**: Configurable CORS settings

## Performance

- **Target Processing Time**: <3 seconds per verification
- **Concurrent Requests**: Up to 10 simultaneous verifications
- **Memory Efficient**: Optimized for low memory usage
- **Scalable Architecture**: Designed for horizontal scaling

## Development

### Project Structure

```
services/verification/
├── main.go                    # Application entry point
├── go.mod                     # Go module definition
├── Dockerfile                 # Docker build configuration
├── docker-compose.yml         # Docker Compose setup
├── internal/
│   ├── config/               # Configuration management
│   ├── handlers/             # HTTP request handlers
│   ├── middleware/           # HTTP middleware
│   ├── models/               # Data models
│   └── services/             # Business logic
└── README.md                 # This file
```

### Testing

```bash
go test ./...
```

### Building

```bash
go build -o verification-service main.go
```

## Integration with Next.js

The service integrates seamlessly with the Next.js frontend:

1. **Environment Setup**: Add `GO_VERIFICATION_SERVICE_URL` to `.env.local`
2. **API Proxy**: Next.js API routes forward requests to the Go service
3. **Error Handling**: Unified error responses across both services

## Monitoring

- Health check endpoint: `GET /health`
- Structured logging with zap
- Performance metrics tracking
- Error rate monitoring

## License

Proprietary - ConnectHub Inc.