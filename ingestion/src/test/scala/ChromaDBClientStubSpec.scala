import zio.test._
import zio.{Chunk, ZIO}
import db.{ChromaDBClient, ChromaDBClientStub}
import streams.RiskIntelPipeline.ChunkedDocument

object ChromaDBClientStubSpec extends ZIOSpecDefault {

  def spec = suite("ChromaDBClientStub")(
    test("upsert succeeds for a single chunk") {
      val stub: ChromaDBClient = new ChromaDBClientStub
      val chunk = ChunkedDocument("content", Map("source" -> "test"), 0)
      for {
        _ <- stub.upsert(chunk)
      } yield assertCompletes
    },
    test("batchUpsert succeeds for multiple chunks") {
      val stub: ChromaDBClient = new ChromaDBClientStub
      val chunks = Chunk(
        ChunkedDocument("doc1", Map("source" -> "a"), 0),
        ChunkedDocument("doc2", Map("source" -> "b"), 1),
      )
      for {
        _ <- stub.batchUpsert(chunks)
      } yield assertCompletes
    },
    test("batchUpsert handles empty batch gracefully") {
      val stub: ChromaDBClient = new ChromaDBClientStub
      for {
        _ <- stub.batchUpsert(Chunk.empty)
      } yield assertCompletes
    },
  )
}
