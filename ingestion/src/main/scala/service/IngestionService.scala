package service

import scrapper.scrapper._
import scrapper.scrapper.ZioScrapper.ScrapperService
import zio._
import zio.stream._
import io.grpc.Status
import scalapb.zio_grpc.StatusException

import db.ChromaDBClient
import streams.RiskIntelPipeline
import config.AppConfig

class IngestionService(chromaClient: ChromaDBClient, cfg: AppConfig) extends ScrapperService {

  override def streamScrapeData(
    request: ZStream[Any, StatusException, ScrapePayload]
  ): ZIO[Any, StatusException, ScrapeResponse] = {

    val pipeline: ZIO[Any, Throwable, (Int, Int)] =
      request
        .mapError(_.asException)
        .collect {
          case p if p.rawContent.trim.nonEmpty => (p.rawContent, p.metadata)
        }
        .via(RiskIntelPipeline.processStream(cfg))
        .grouped(cfg.batchSize)
        .mapZIO { batch =>
          chromaClient
            .batchUpsert(batch)
            .as(batch.size)
            .catchAll { err =>
              ZIO.logWarning(s"ChromaDB batch upsert failed (${batch.size} chunks): ${err.getMessage}").as(0)
            }
        }
        .runFold((0, 0)) { case ((processed, failed), batchProcessed) =>
          if (batchProcessed > 0) (processed + batchProcessed, failed)
          else (processed, failed + 1)
        }

    pipeline.mapBoth(
      err => StatusException(Status.INTERNAL.withDescription(s"Stream processing failed: ${err.getMessage}")),
      { case (processed, failedBatches) =>
        val success = failedBatches == 0
        val msg =
          if (success) s"Stream processed successfully. Chunks upserted: $processed"
          else s"Stream complete with $failedBatches failed batch(es). Chunks upserted: $processed"
        ZIO.logInfo(msg)
        ScrapeResponse(success = success, message = msg, processedCount = processed)
      }
    ).flatMap { case (effect, response) => effect.as(response) }
  }
}

object IngestionService {
  val layer: URLayer[ChromaDBClient with AppConfig, IngestionService] =
    ZLayer.fromFunction(new IngestionService(_, _))
}
