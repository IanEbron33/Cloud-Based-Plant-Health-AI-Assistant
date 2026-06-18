# Build Stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY go.mod ./

# Copy source code
COPY main.go ./

# Automatically tidy dependencies and generate go.sum entries during build
RUN go mod tidy

# Compile binary statically
RUN CGO_ENABLED=0 GOOS=linux go build -o bugsok-proxy .

# Final Run Stage
FROM alpine:latest

# Install CA certificates to allow HTTPS calls to Google GenAI API
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the compiled binary from the builder stage
COPY --from=builder /app/bugsok-proxy .

# Set up port configuration (matches Hugging Face default port)
EXPOSE 7860

# Start server
CMD ["./bugsok-proxy"]
