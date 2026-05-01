package streams

import zio._
import zio.stream._
import config.AppConfig

object RiskIntelPipeline {

  case class ChunkedDocument(
    content:    String,
    metadata:   Map[String, String],
    chunkIndex: Int
  )

  def chunkText(text: String, chunkSize: Int, overlap: Int): Chunk[String] = {
    if (text.length <= chunkSize) return Chunk(text)
    val step = chunkSize - overlap
    Chunk.fromIterable((0 until text.length by step).map { start =>
      text.substring(start, Math.min(start + chunkSize, text.length))
    })
  }

  def processStream(
    cfg: AppConfig
  )(rawStream: ZStream[Any, Throwable, (String, Map[String, String])]): ZStream[Any, Throwable, ChunkedDocument] =
    rawStream.flatMap { case (text, meta) =>
      val normalized = text.trim.replaceAll("\\s+", " ")
      val chunks = chunkText(normalized, cfg.chunkSize, cfg.chunkOverlap)
      ZStream.fromIterable(chunks.zipWithIndex).map { case (chunk, idx) =>
        ChunkedDocument(chunk, meta, idx)
      }
    }
}
