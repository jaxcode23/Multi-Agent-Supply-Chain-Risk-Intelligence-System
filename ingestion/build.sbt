name := "riskintel-ingestion"
version := "0.1.0"
scalaVersion := "2.13.18"

val AkkaVersion = "2.8.5"
val AkkaHttpVersion = "10.5.3"
val ZioVersion = "2.0.19"
val ScalaPbVersion = "0.11.13"

libraryDependencies ++= Seq(
  // Core Akka Streams & Actors
  "com.typesafe.akka" %% "akka-stream" % AkkaVersion,
  "com.typesafe.akka" %% "akka-actor-typed" % AkkaVersion,
  
  // Akka HTTP for the Web Port
  "com.typesafe.akka" %% "akka-http" % AkkaHttpVersion,
  "com.typesafe.akka" %% "akka-http-spray-json" % AkkaHttpVersion,
  
  // ZIO for High-Performance Streams
  "dev.zio" %% "zio" % ZioVersion,
  "dev.zio" %% "zio-streams" % ZioVersion,
  
  // ScalaPB for gRPC
  "com.thesamet.scalapb" %% "scalapb-runtime" % ScalaPbVersion % "protobuf",
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc" % ScalaPbVersion,

  // Structured Logging
  "ch.qos.logback" % "logback-classic" % "1.4.11"
)

// ScalaPB Settings
Compile / PB.targets := Seq(
  scalapb.gen(grpc = true) -> (Compile / sourceManaged).value / "scalapb"
)
