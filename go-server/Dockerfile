FROM golang:1.25-alpine AS builder
WORKDIR /app/go-server
COPY . .
RUN go mod download
RUN go build -o main .

FROM alpine:latest
WORKDIR /app/go-server
COPY --from=builder /app/go-server/main .
EXPOSE 8080
CMD ["./main"]

