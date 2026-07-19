FROM sbtscala/scala-sbt:graalvm-community-17.0.2_1.10.7_2.13.18 AS build

WORKDIR /app
COPY ingestion/project/ project/
COPY ingestion/build.sbt .
RUN sbt update

COPY ingestion/src/ src/
COPY proto/ /proto/
RUN sbt assembly

FROM eclipse-temurin:17-jre-jammy

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r app && useradd -r -g app app

WORKDIR /app
COPY --from=build --chown=app:app /app/target/scala-2.13/riskintel-ingestion-assembly-*.jar /app/app.jar

USER app

EXPOSE 9090 9091

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:9091/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
