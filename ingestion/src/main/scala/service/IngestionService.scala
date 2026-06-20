package service

import scrapper.scrapper._
import scrapper.scrapper.ZioScrapper.ScrapperService
import zio._
import zio.stream._
import io.grpc.StatusException

import db.ChromaDBClient
import streams.RiskIntelPipeline
import streams.RiskIntelPipeline.ChunkedDocument
import config.AppConfig

class IngestionService(chromaClient: ChromaDBClient, cfg: AppConfig) extends ScrapperService {

  override def streamScrapeData(
    request: Stream[StatusException, ScrapePayload]
  ): IO[StatusException, ScrapeResponse] = {

    val result: IO[Throwable, ScrapeResponse] =
      request
        .mapError(e => e: Throwable)
        .collect { case p if p.rawContent.trim.nonEmpty => (p.rawContent, p.metadata) }
        .flatMap { case (text, meta) =>
          val normalized = text.trim.replaceAll("\\s+", " ")
          val chunks = RiskIntelPipeline.chunkText(normalized, cfg.chunkSize, cfg.chunkOverlap)
          ZStream.fromIterable(chunks.zipWithIndex.map { case (content, idx) =>
            ChunkedDocument(content, meta, idx)
          })
        }
        .grouped(cfg.batchSize)
        .mapZIO { batch =>
          chromaClient
            .batchUpsert(batch)
            .as(batch.size)
            .catchAll { err =>
              ZIO.logWarning(s"ChromaDB batch upsert failed (${batch.size} chunks): ${err.getMessage}").as(0)
            }
        }
        .runFold[(Int, Int)]((0, 0)) { case ((processed, failed), batchProcessed) =>
          if (batchProcessed > 0) (processed + batchProcessed, failed)
          else (processed, failed + 1)
        }
        .flatMap { case (processed, failedBatches) =>
          val success = failedBatches == 0
          val msg =
            if (success) s"Stream processed successfully. Chunks upserted: $processed"
            else s"Stream complete with $failedBatches failed batch(es). Chunks upserted: $processed"
          ZIO.logInfo(msg).as(ScrapeResponse(success = success, message = msg, processedCount = processed))
        }

    result.catchAll(err =>
      ZIO.fail(new StatusException(io.grpc.Status.INTERNAL.withDescription(
        s"Stream processing failed: ${err.getMessage}"
      )))
    )
  }
}

object IngestionService {
  val layer: URLayer[ChromaDBClient with AppConfig, IngestionService] =
    ZLayer.fromFunction(new IngestionService(_, _))
}
