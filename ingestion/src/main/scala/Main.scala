import zio._
import zio.http.Client
import zio.logging.backend.SLF4J

import io.grpc.ServerBuilder

import scalapb.zio_grpc.{ServerLayer, Server}

import service.IngestionService
import db.ChromaDBClient
import config.AppConfig

object Main extends ZIOAppDefault {

  override val bootstrap: ZLayer[Any, Nothing, Unit] =
    Runtime.removeDefaultLoggers >>> SLF4J.slf4j

  override def run: ZIO[Any, Throwable, Nothing] = {
    val cfg = AppConfig.load()

    val serverLayer: ZLayer[IngestionService, Throwable, Server] =
      ZLayer.scoped {
        for {
          service <- ZIO.service[IngestionService]
          env     <- ServerLayer.fromService(ServerBuilder.forPort(cfg.grpcPort), service).build
        } yield env.get[Server]
      }

    val fullLayer: ZLayer[Any, Throwable, Server] =
      ZLayer.make[Server](
        Client.default,
        ZLayer.succeed(cfg),
        ChromaDBClient.auto,
        IngestionService.layer,
        serverLayer
      )

    fullLayer.launch
  }
}