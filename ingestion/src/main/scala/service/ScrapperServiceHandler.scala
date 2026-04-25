package service

import scrapper.scrapper._
import scrapper.scrapper.ZioScrapper.ScrapperService
import zio._
import zio.stream._
import streams.RiskIntelPipeline
import streams.RiskIntelPipeline.ChunkedDocument

class ScrapperServiceHandler extends ScrapperService {

  override def streamScrapeData(request: ZStream[Any, StatusException, ScrapePayload]): ZIO[Any, StatusException, ScrapeResponse] = {
    // Pipe the gRPC stream into our processing pipeline
    val processingFiber = request
      .map(p => (p.rawContent, p.metadata))
      .via(RiskIntelPipeline.processStream)
      .runForeach { chunkedDoc =>
        // Here we will trigger the Vector DB Sink
        ZIO.logInfo(s"Processed chunk ${chunkedDoc.chunkIndex} for source ${chunkedDoc.metadata.getOrElse("source", "unknown")}")
      }

    processingFiber
      .mapBoth(
        err => StatusException(Status.INTERNAL.withDescription(err.getMessage)),
        _ => ScrapeResponse(success = true, message = "Stream processed successfully")
      )
  }
}

object ScrapperServiceHandler {
  val layer: ULayer[ScrapperServiceHandler] = ZLayer.succeed(new ScrapperServiceHandler)
}
