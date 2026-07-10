package streams

import zio._

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

}
