package db

import zio._
import zio.http._
import streams.RiskIntelPipeline.ChunkedDocument
import zio.json._

object ChromaSink {

  case class ChromaUpsert(
    ids: List[String],
    embeddings: Option[List[List[Float]]],
    metadatas: List[Map[String, String]],
    documents: List[String]
  )

  implicit val encoder: JsonEncoder[ChromaUpsert] = DeriveJsonEncoder.gen[ChromaUpsert]

  // Mock implementation of Vector Upsert
  def upsert(chunk: ChunkedDocument): ZIO[Client, Throwable, Unit] = {
    val payload = ChromaUpsert(
      ids = List(s"${chunk.metadata.getOrElse("source", "doc")}-${chunk.chunkIndex}"),
      embeddings = None, // Let Chroma handle embedding if configured or send pre-computed
      metadatas = List(chunk.metadata),
      documents = List(chunk.content)
    )

    // In a real scenario, we would POST to http://chroma:8000/api/v1/collections/...
    ZIO.logInfo(s"Upserting chunk to ChromaDB: ${payload.ids.head}")
    ZIO.unit
  }

  def batchUpsert(chunks: Chunk[ChunkedDocument]): ZIO[Client, Throwable, Unit] = {
    ZIO.foreachDiscard(chunks)(upsert)
  }
}
