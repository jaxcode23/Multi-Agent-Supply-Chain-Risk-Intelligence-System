import zio.test._
import models.{IntelDocument, ChunkRecord}

object IntelDocumentSpec extends ZIOSpecDefault {

  def spec = suite("IntelDocument")(
    suite("IntelDocument")(
      test("can be constructed with required fields") {
        val doc = IntelDocument(
          id = "doc-1",
          sourceUrl = "https://example.com",
          domainEntity = "Tata",
          rawContent = "some content",
          timestamp = 1000L,
        )
        assertTrue(doc.id == "doc-1" && doc.domainEntity == "Tata")
      },
      test("metadata defaults to empty map") {
        val doc = IntelDocument(
          id = "doc-2", sourceUrl = "", domainEntity = "", rawContent = "", timestamp = 0L,
        )
        assertTrue(doc.metadata.isEmpty)
      },
    ),
    suite("ChunkRecord")(
      test("can be constructed with required fields") {
        val rec = ChunkRecord("chunk-1", "doc-1", "content", 0)
        assertTrue(rec.id == "chunk-1" && rec.documentId == "doc-1")
      },
      test("metadata defaults to empty map") {
        val rec = ChunkRecord("c1", "d1", "text", 0)
        assertTrue(rec.metadata.isEmpty)
      },
    ),
  )
}
