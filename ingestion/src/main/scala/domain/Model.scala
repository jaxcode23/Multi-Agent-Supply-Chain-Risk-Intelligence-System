package domain

// The messy, raw data coming from the scrapers or Kafka
case class RawScraperPayload(
    source: String,
    raw_text: String,
    timestamp: Long
)

// The clean, structured data ready for the Python AI Agents
case class NormalizedRiskEvent(
    eventId: String,
    source: String,
    content: String,
    processedAt: Long,
    status: String
)
