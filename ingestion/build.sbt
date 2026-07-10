name := "riskintel-ingestion"
version := "0.1.0"
scalaVersion := "2.13.18"

val ZioVersion      = "2.0.19"
val ZioGrpcVersion  = "0.6.1"   // scalapb-zio-grpc — must align with ScalaPbVersion below
val ScalaPbVersion  = "0.11.13"
val ZioHttpVersion  = "3.0.0-RC4"

libraryDependencies ++= Seq(

  // ── ZIO Core ─────────────────────────────────────────────────────────────
  "dev.zio" %% "zio"         % ZioVersion,
  "dev.zio" %% "zio-streams" % ZioVersion,

  // ── ZIO HTTP (used by ChromaSink to POST to ChromaDB REST API) ───────────
  "dev.zio" %% "zio-http"    % ZioHttpVersion,

  // ── ZIO JSON (used by ChromaSink payload serialisation) ──────────────────
  "dev.zio" %% "zio-json"    % "0.6.2",

  // ── ZIO Logging → SLF4J bridge ───────────────────────────────────────────
  // Routes ZIO.logInfo / logError calls to SLF4J, which logback picks up.
  "dev.zio" %% "zio-logging"      % "2.1.14",
  "dev.zio" %% "zio-logging-slf4j" % "2.1.14",

  // ── ScalaPB runtime (protobuf serialisation) ─────────────────────────────
  "com.thesamet.scalapb" %% "scalapb-runtime"      % ScalaPbVersion % "protobuf",
  "com.thesamet.scalapb" %% "scalapb-runtime-grpc"  % ScalaPbVersion,

  // ── scalapb-zio-grpc — ZIO-native gRPC server traits ─────────────────────
  // Generates ZioScrapper.ScrapperService ZIO trait from scrapper.proto.
  "com.thesamet.scalapb.zio-grpc" %% "zio-grpc-core" % ZioGrpcVersion,

  // ── gRPC Netty transport (the actual HTTP/2 wire layer) ───────────────────
  "io.grpc" % "grpc-netty-shaded" % "1.58.0",

  // ── Structured logging backend ────────────────────────────────────────────
  "ch.qos.logback"                % "logback-classic"          % "1.4.11",
  "net.logstash.logback"          % "logstash-logback-encoder" % "7.4",

  // ── ZIO Test ────────────────────────────────────────────────────────────────
  "dev.zio" %% "zio-test"     % ZioVersion % Test,
  "dev.zio" %% "zio-test-sbt" % ZioVersion % Test,
)

testFrameworks += new TestFramework("zio.test.sbt.ZTestFramework")

// ScalaPB: generate both plain case classes AND the ZIO gRPC service traits
import scalapb.zio_grpc.ZioCodeGenerator

// Reference the canonical proto definitions in the root project
Compile / PB.protoSources += file("../proto")

Compile / PB.targets := Seq(
  scalapb.gen(grpc = true) -> (Compile / sourceManaged).value / "scalapb",
  ZioCodeGenerator -> (Compile / sourceManaged).value / "scalapb"
)
