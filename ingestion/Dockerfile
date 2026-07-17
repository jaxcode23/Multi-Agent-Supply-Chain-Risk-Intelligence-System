FROM sbtscala/scala-sbt:graalvm-community-17.0.2_1.10.7_2.13.18 AS build

WORKDIR /app
COPY project/ project/
COPY build.sbt .
RUN sbt update

COPY src/ src/
COPY proto/ /proto/
RUN sbt assembly

FROM eclipse-temurin:17-jre

RUN groupadd -r app && useradd -r -g app app

WORKDIR /app
COPY --from=build /app/target/scala-2.13/riskintel-ingestion-assembly-*.jar /app/app.jar

USER app

EXPOSE 9090

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD java -jar /app/app.jar --help > /dev/null 2>&1 || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
