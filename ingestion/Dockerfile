FROM sbtscala/scala-sbt:graalvm-community-17.0.2_1.10.7_2.13.18 AS build

WORKDIR /app
COPY project/ project/
COPY build.sbt .
RUN sbt update

COPY src/ src/
COPY src/main/protobuf/ src/main/protobuf/
RUN sbt compile

FROM eclipse-temurin:17-jre

WORKDIR /app
COPY --from=build /app/target/ /app/target/
COPY --from=build /app/src/main/resources/ /app/resources/

EXPOSE 9090

ENTRYPOINT ["java", "-cp", "/app/target/scala-2.13/classes:/app/target/scala-2.13/src_managed/main/scalapb:/app/resources", "Main"]
