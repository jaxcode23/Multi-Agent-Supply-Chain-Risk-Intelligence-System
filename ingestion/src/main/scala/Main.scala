import zio._
import zio.http.Client
import zio.logging.backend.SLF4J

import scalapb.zio_grpc.{ServerLayer, ServiceList}

import service.IngestionService
import db.ChromaDBClient
import config.AppConfig

object Main extends ZIOAppDefault {

  override val bootstrap: ZLayer[Any, Nothing, Unit] =
    Runtime.removeDefaultLoggers >>> SLF4J.slf4j

  override def run: ZIO[Any, Throwable, Nothing] = {
    val cfg = AppConfig.load()

    val serverProgram: ZIO[IngestionService, Throwable, Nothing] =
      for {
        _ <- ZIO.logInfo(s"🚀 Scala gRPC Ingestion Hub starting on port ${cfg.grpcPort}")
        _ <- ZIO.logInfo(s"ChromaDB → ${cfg.chromaHost} / ${cfg.chromaCollection}")
        server <- ServerLayer
                    .fromServiceList(cfg.grpcPort)(ServiceList.add[IngestionService])
                    .launch
      } yield server

    serverProgram.provide(
      Client.default,
      ZLayer.succeed(cfg),
      ChromaDBClient.auto,
      IngestionService.layer,
    )
  }
}