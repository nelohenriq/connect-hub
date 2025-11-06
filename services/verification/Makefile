.PHONY: build test clean docker-build docker-run benchmark lint

# Build the application
build:
	go build -o bin/verification-service main.go

# Run tests
test:
	go test ./... -v -cover

# Run tests with coverage report
test-coverage:
	go test ./... -v -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

# Run benchmarks
benchmark:
	go test -bench=. -benchmem -run=^$ ./...

# Run benchmarks with memory profiling
benchmark-profile:
	go test -bench=. -benchmem -memprofile=mem.prof -run=^$ ./...
	go tool pprof -web mem.prof

# Run linter
lint:
	golangci-lint run

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html
	rm -f *.prof
	rm -rf storage/

# Docker build
docker-build:
	docker build -t connect-hub/verification-service .

# Docker run
docker-run:
	docker run -p 8080:8080 --env-file .env connect-hub/verification-service

# Docker compose up
docker-up:
	docker-compose up --build

# Docker compose down
docker-down:
	docker-compose down

# Development run
dev:
	go run main.go

# Install dependencies
deps:
	go mod tidy
	go mod download

# Update dependencies
deps-update:
	go get -u ./...
	go mod tidy

# Security check
security:
	gosec ./...

# Format code
fmt:
	go fmt ./...

# Vet code
vet:
	go vet ./...

# Run all checks
check: fmt vet lint security test

# Generate mocks (if using mockery)
mocks:
	@echo "Generating mocks..."
	# mockery --all --output ./mocks

# Install development tools
install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest
	go install github.com/vektra/mockery/v2@latest

# Create storage directory
init-storage:
	mkdir -p storage

# Show help
help:
	@echo "Available commands:"
	@echo "  build          - Build the application"
	@echo "  test           - Run tests"
	@echo "  test-coverage  - Run tests with coverage report"
	@echo "  benchmark      - Run benchmarks"
	@echo "  benchmark-profile - Run benchmarks with memory profiling"
	@echo "  lint           - Run linter"
	@echo "  clean          - Clean build artifacts"
	@echo "  docker-build   - Build Docker image"
	@echo "  docker-run     - Run Docker container"
	@echo "  docker-up      - Start with docker-compose"
	@echo "  docker-down    - Stop docker-compose"
	@echo "  dev            - Run in development mode"
	@echo "  deps           - Install dependencies"
	@echo "  deps-update    - Update dependencies"
	@echo "  security       - Run security checks"
	@echo "  fmt            - Format code"
	@echo "  vet            - Vet code"
	@echo "  check          - Run all checks"
	@echo "  install-tools  - Install development tools"
	@echo "  init-storage   - Create storage directory"
	@echo "  help           - Show this help"