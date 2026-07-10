import zio.test._
import streams.RiskIntelPipeline

object RiskIntelPipelineSpec extends ZIOSpecDefault {

  def spec = suite("RiskIntelPipeline")(
    suite("chunkText")(
      test("returns single chunk for text shorter than chunk size") {
        val result = RiskIntelPipeline.chunkText("hello world", 100, 10)
        assertTrue(result.length == 1 && result(0) == "hello world")
      },
      test("splits text exceeding chunk size into multiple chunks") {
        val text  = "a" * 500
        val chunks = RiskIntelPipeline.chunkText(text, 200, 50)
        assertTrue(chunks.length == 4)
      },
      test("ensures each chunk has correct size except possibly last") {
        val text  = "hello world this is a test of the chunking mechanism"
        val chunks = RiskIntelPipeline.chunkText(text, 10, 3)
        chunks.init.foreach { c =>
          assertTrue(c.length <= 10)
        }
        assertTrue(chunks.nonEmpty)
      },
      test("handles empty string") {
        val chunks = RiskIntelPipeline.chunkText("", 100, 10)
        assertTrue(chunks.length == 1 && chunks(0) == "")
      },
      test("preserves content when reassembled from non-overlapping chunks") {
        val text   = "The quick brown fox jumps over the lazy dog."
        val chunks = RiskIntelPipeline.chunkText(text, 20, 0)
        val reassembled = chunks.mkString
        assertTrue(reassembled == text)
      },
      test("handles text exactly equal to chunk size") {
        val text   = "x" * 100
        val chunks = RiskIntelPipeline.chunkText(text, 100, 20)
        assertTrue(chunks.length == 1 && chunks(0) == text)
      },
      test("overlap creates redundant content between adjacent chunks") {
        val text   = "abcdefghijklmnopqrstuvwxyz"
        val chunks = RiskIntelPipeline.chunkText(text, 10, 5)
        // With step=5, we expect ceiling(26/5) = 6 chunks
        assertTrue(chunks.length == 6)
        // Adjacent chunks share overlap region
        assertTrue(chunks(1).startsWith("fghij"))
      },
    ),
  )
}
