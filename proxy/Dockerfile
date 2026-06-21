# Stage 1: Compile the Go application static binary
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go.mod definition
COPY go.mod ./

# Copy all source files
COPY *.go ./

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

# Stage 2: Create lightweight runner container
FROM alpine:latest

WORKDIR /app

# Copy compiled binary from builder
COPY --from=builder /app/server /app/server

# Expose port (Hugging Face Spaces default container port)
EXPOSE 7860

# Run the proxy server
CMD ["/app/server"]
