import zio._
import zio.http.{Client, Server}
import zio.logging.backend.SLF4J

import io.grpc.ServerBuilder

import scalapb.zio_grpc.{ServerLayer => GrpcServerLayer}

import service.IngestionService
import db.ChromaDBClient
import config.AppConfig
import health.HealthRoutes

object Main extends ZIOAppDefault {

  override val bootstrap: ZLayer[Any, Nothing, Unit] =
    Runtime.removeDefaultLoggers >>> SLF4J.slf4j

  override def run: ZIO[Any, Throwable, Nothing] = {
    val cfg = AppConfig.load()

    val grpcServerLayer: ZLayer[IngestionService, Throwable, scalapb.zio_grpc.Server] =
      ZLayer.scoped {
        for {
          service <- ZIO.service[IngestionService]
          env     <- GrpcServerLayer.fromService(ServerBuilder.forPort(cfg.grpcPort), service).build
        } yield env.get[scalapb.zio_grpc.Server]
      }

    val httpClientLayer = Client.default

    val healthApp = HealthRoutes.app.provideSome[Client](ZLayer.succeed(cfg))

    val httpServerLayer = Server.serve(healthApp).provide(
      Server.defaultWithPort(cfg.httpPort),
    )

    val fullGrpcLayer: ZLayer[Any, Throwable, scalapb.zio_grpc.Server] =
      ZLayer.make[scalapb.zio_grpc.Server](
        httpClientLayer,
        ZLayer.succeed(cfg),
        ChromaDBClient.auto,
        IngestionService.layer,
        grpcServerLayer
      )

    (fullGrpcLayer.zipPar(httpServerLayer)).forkDaemon.flatMap { fiber =>
      ZIO.logInfo(s"Scala Ingestion Hub started — gRPC :${cfg.grpcPort}, HTTP :${cfg.httpPort}") *>
      fiber.join
    }
  }
}
