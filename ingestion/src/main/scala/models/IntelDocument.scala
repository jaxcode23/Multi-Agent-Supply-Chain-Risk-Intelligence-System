package models

import java.time.Instant

case class IntelDocument(
  id:          String,
  sourceUrl:   String,
  domainEntity: String,
  rawContent:  String,
  timestamp:   Long,
  ingestedAt:  Instant  = Instant.now(),
  metadata:    Map[String, String] = Map.empty,
)

case class ChunkRecord(
  id:          String,
  documentId:  String,
  content:     String,
  chunkIndex:  Int,
  metadata:    Map[String, String] = Map.empty,
)
