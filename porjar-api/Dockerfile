# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /porjar-api ./cmd/server

# Run stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Makassar

WORKDIR /app

COPY --from=builder /porjar-api .
COPY --from=builder /app/migrations ./migrations

RUN mkdir -p /app/storage/uploads

EXPOSE 8080

CMD ["./porjar-api"]
