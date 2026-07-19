FROM golang:1.26-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/scraper ./cmd/api

FROM alpine:3.19

RUN apk add --no-cache wget ca-certificates && \
    addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /bin/scraper /scraper

USER app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["/scraper"]
