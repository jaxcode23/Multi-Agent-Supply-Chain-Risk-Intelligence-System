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

  override def run = {
    val cfg = AppConfig.load()

    val grpcServerLayer: ZLayer[IngestionService, Throwable, scalapb.zio_grpc.Server] =
      ZLayer.scoped {
        for {
          service <- ZIO.service[IngestionService]
          env     <- GrpcServerLayer.fromService(ServerBuilder.forPort(cfg.grpcPort), service).build
        } yield env.get[scalapb.zio_grpc.Server]
      }

    val httpApp = HealthRoutes.app.toHttpApp

    (for {
      grpcFiber <- ZIO.scoped {
                     grpcServerLayer.build.flatMap(env =>
                       env.get[scalapb.zio_grpc.Server].awaitTermination
                     )
                   }.forkDaemon
      httpFiber <- Server.serve(httpApp)
                     .provide(
                       Server.defaultWithPort(cfg.httpPort),
                       ZLayer.succeed(cfg),
                       Client.default,
                     )
                     .forkDaemon
      _         <- ZIO.logInfo(s"Scala Ingestion Hub started — gRPC :${cfg.grpcPort}, HTTP :${cfg.httpPort}")
      _         <- grpcFiber.join.zipPar(httpFiber.join)
    } yield ())
    .provide(
      Client.default,
      ZLayer.succeed(cfg),
      ChromaDBClient.auto,
      IngestionService.layer,
    )
  }
}
