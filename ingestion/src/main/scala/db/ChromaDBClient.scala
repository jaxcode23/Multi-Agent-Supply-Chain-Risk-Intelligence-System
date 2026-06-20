package db

import zio._
import zio.http._
import zio.json._
import streams.RiskIntelPipeline.ChunkedDocument
import config.AppConfig

import java.io.IOException

private case class ChromaUpsertRequest(
  ids:       List[String],
  documents: List[String],
  metadatas: List[Map[String, String]],
  embeddings: Option[List[List[Float]]] = None
)

private object ChromaUpsertRequest {
  implicit val encoder: JsonEncoder[ChromaUpsertRequest] =
    DeriveJsonEncoder.gen[ChromaUpsertRequest]
}

trait ChromaDBClient {
  def upsert(chunk: ChunkedDocument): ZIO[Any, Throwable, Unit]
  def batchUpsert(chunks: Chunk[ChunkedDocument]): ZIO[Any, Throwable, Unit]
}

final class ChromaDBClientLive(httpClient: Client, cfg: AppConfig) extends ChromaDBClient {

  private val upsertUrl =
    s"https://${cfg.chromaHost}/api/v1/collections/${cfg.chromaCollection}/upsert"

  override def upsert(chunk: ChunkedDocument): ZIO[Any, Throwable, Unit] =
    batchUpsert(Chunk.single(chunk))

  override def batchUpsert(chunks: Chunk[ChunkedDocument]): ZIO[Any, Throwable, Unit] = {
    if (chunks.isEmpty) return ZIO.unit

    val body = ChromaUpsertRequest(
      ids = chunks.map { c =>
        s"${c.metadata.getOrElse("source", "doc")}-${c.chunkIndex}-${java.lang.System.currentTimeMillis()}"
      }.toList,
      documents = chunks.map(_.content).toList,
      metadatas = chunks.map(_.metadata).toList
    )

    val request = Request
      .post(url = URL.decode(upsertUrl).getOrElse(URL.empty), body = Body.fromString(body.toJson))
      .addHeader(Header.ContentType(MediaType.application.json))
      .addHeader("X-Chroma-Token", cfg.chromaApiKey)

    ZIO.scoped {
      httpClient
        .request(request)
        .flatMap { resp =>
          if (resp.status.isSuccess)
            ZIO.logDebug(s"ChromaDB upsert OK — ${chunks.size} chunks → ${cfg.chromaCollection}")
          else
            resp.body.asString.flatMap { b =>
              ZIO.fail(new RuntimeException(s"ChromaDB upsert failed [${resp.status.code}]: $b"))
            }
        }
    }
  }
}

final class ChromaDBClientStub extends ChromaDBClient {
  override def upsert(chunk: ChunkedDocument): ZIO[Any, Throwable, Unit] =
    ZIO.logInfo(s"[STUB] ChromaDB upsert — chunk ${chunk.chunkIndex}")
  override def batchUpsert(chunks: Chunk[ChunkedDocument]): ZIO[Any, Throwable, Unit] =
    ZIO.foreachDiscard(chunks)(upsert)
}

object ChromaDBClient {
  val live: URLayer[Client with AppConfig, ChromaDBClient] =
    ZLayer.fromFunction { (client: Client, cfg: AppConfig) =>
      new ChromaDBClientLive(client, cfg): ChromaDBClient
    }

  val stub: ULayer[ChromaDBClient] =
    ZLayer.succeed(new ChromaDBClientStub: ChromaDBClient)

  val auto: URLayer[Client with AppConfig, ChromaDBClient] =
    ZLayer.fromFunction { (client: Client, cfg: AppConfig) =>
      if (cfg.chromaApiKey.nonEmpty) new ChromaDBClientLive(client, cfg): ChromaDBClient
      else new ChromaDBClientStub: ChromaDBClient
    }
}
