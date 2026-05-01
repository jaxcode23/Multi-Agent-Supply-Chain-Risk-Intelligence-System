package config

import scala.util.Try

case class AppConfig(
  grpcPort:         Int,
  chromaHost:       String,
  chromaApiKey:     String,
  chromaTenant:     String,
  chromaDatabase:   String,
  chromaCollection: String,
  chunkSize:        Int,
  chunkOverlap:     Int,
  batchSize:        Int,
)

object AppConfig {
  def load(): AppConfig = AppConfig(
    grpcPort         = env("GRPC_PORT",        "9090").toInt,
    chromaHost       = env("CHROMA_HOST",       "api.trychroma.com"),
    chromaApiKey     = env("CHROMA_API_KEY",    ""),
    chromaTenant     = env("CHROMA_TENANT",     ""),
    chromaDatabase   = env("CHROMA_DATABASE",   "supply-chain-db"),
    chromaCollection = env("CHROMA_COLLECTION", "supply_chain_intel"),
    chunkSize        = env("CHUNK_SIZE",        "1000").toInt,
    chunkOverlap     = env("CHUNK_OVERLAP",     "200").toInt,
    batchSize        = env("CHROMA_BATCH_SIZE", "10").toInt,
  )

  private def env(key: String, default: String): String =
    sys.env.getOrElse(key, default)
}
