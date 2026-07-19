# syntax=docker/dockerfile:1

FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /gateway ./cmd/gateway

FROM alpine:3.20 AS runtime
RUN apk add --no-cache ca-certificates
COPY --from=build /gateway /usr/local/bin/gateway

EXPOSE 8080
ENTRYPOINT ["gateway"]
