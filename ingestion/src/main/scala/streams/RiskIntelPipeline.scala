package streams

import zio._
import zio.stream._

object RiskIntelPipeline {

  case class ChunkedDocument(
    content: String,
    metadata: Map[String, String],
    chunkIndex: Int
  )

  // Chunking logic with overlap
  def chunkText(text: String, chunkSize: Int = 1000, overlap: Int = 200): Chunk[String] = {
    if (text.length <= chunkSize) return Chunk(text)
    
    val step = chunkSize - overlap
    val indices = 0 until text.length by step
    
    Chunk.fromIterable(indices.map { start =>
      val end = Math.min(start + chunkSize, text.length)
      text.substring(start, end)
    })
  }

  // ZPipeline for transformation
  val normalizationPipeline: ZPipeline[Any, Nothing, String, String] = 
    ZPipeline.map[String, String](_.trim.replaceAll("\\s+", " "))

  def processStream(rawStream: ZStream[Any, Throwable, (String, Map[String, String])]): ZStream[Any, Throwable, ChunkedDocument] = {
    rawStream.flatMap { case (text, meta) =>
      val normalized = text.trim.replaceAll("\\s+", " ")
      val chunks = chunkText(normalized)
      
      ZStream.fromIterable(chunks.zipWithIndex).map { case (chunk, idx) =>
        ChunkedDocument(chunk, meta, idx)
      }
    }
  }
}
