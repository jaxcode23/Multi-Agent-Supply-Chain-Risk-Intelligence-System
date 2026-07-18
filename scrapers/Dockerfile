FROM golang:1.26 AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/scraper ./cmd/api

FROM gcr.io/distroless/static

COPY --from=build /bin/scraper /scraper

EXPOSE 8080

ENTRYPOINT ["/scraper"]
