package transforms

import akka.stream.scaladsl.Flow
import domain.{RawScraperPayload, NormalizedRiskEvent}
import java.util.UUID

object DataCleaner {

  // Flow[InputType, OutputType, MatValue]
  val normalizeDataFlow: Flow[RawScraperPayload, NormalizedRiskEvent, _] = 
    Flow[RawScraperPayload]
      .filter(payload => payload.raw_text.nonEmpty) // Drop empty payloads immediately
      .map { raw =>
        // Here you would add real normalization logic (regex, trimming, etc.)
        val cleanedText = raw.raw_text.trim.replaceAll("\\s+", " ")
        
        NormalizedRiskEvent(
          eventId = UUID.randomUUID().toString,
          source = raw.source.toUpperCase(), // Standardize sources
          content = cleanedText,
          processedAt = System.currentTimeMillis(),
          status = "READY_FOR_ANALYSIS"
        )
      }
}
