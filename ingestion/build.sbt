name := "riskintel-ingestion"
version := "0.1.0"
scalaVersion := "2.13.18"

val AkkaVersion = "2.8.5"
val AkkaHttpVersion = "10.5.3"

libraryDependencies ++= Seq(
  // Core Akka Streams & Actors
  "com.typesafe.akka" %% "akka-stream" % AkkaVersion,
  "com.typesafe.akka" %% "akka-actor-typed" % AkkaVersion,
  
  // Akka HTTP for the Web Port
  "com.typesafe.akka" %% "akka-http" % AkkaHttpVersion,
  "com.typesafe.akka" %% "akka-http-spray-json" % AkkaHttpVersion,
  
  // Structured Logging
  "ch.qos.logback" % "logback-classic" % "1.4.11"
)
