import zio.test._
import domain.{RawScraperPayload, NormalizedRiskEvent}

object DomainModelSpec extends ZIOSpecDefault {

  def spec = suite("DomainModel")(
    suite("RawScraperPayload")(
      test("can be constructed with all fields") {
        val p = RawScraperPayload("news-site", "some text", 1000L)
        assertTrue(p.source == "news-site" && p.raw_text == "some text" && p.timestamp == 1000L)
      },
      test("supports pattern matching") {
        val payload = RawScraperPayload("blog", "content", 2000L)
        val result = payload match {
          case RawScraperPayload(s, _, _) => s
        }
        assertTrue(result == "blog")
      },
    ),
    suite("NormalizedRiskEvent")(
      test("can be constructed with all fields") {
        val e = NormalizedRiskEvent("evt-1", "news", "content", 1000L, "PENDING")
        assertTrue(e.eventId == "evt-1" && e.status == "PENDING")
      },
      test("default status is PENDING") {
        val e = NormalizedRiskEvent("evt-2", "rss", "data", 2000L, "PENDING")
        assertTrue(e.status == "PENDING")
      },
    ),
  )
}
