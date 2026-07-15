package config

import scala.util.Try

case class AppConfig(
  grpcPort:         Int,
  httpPort:         Int,
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
  def load(): AppConfig = {
    val cfg = AppConfig(
      grpcPort         = env("GRPC_PORT",          "9090").toInt,
      httpPort         = env("HEALTH_HTTP_PORT",    "9091").toInt,
      chromaHost       = env("CHROMA_HOST",         "chroma"),
      chromaApiKey     = env("CHROMA_API_KEY",      ""),
      chromaTenant     = env("CHROMA_TENANT",       ""),
      chromaDatabase   = env("CHROMA_DATABASE",     "supply-chain-db"),
      chromaCollection = env("CHROMA_COLLECTION",   "supply_chain_intel"),
      chunkSize        = env("CHUNK_SIZE",          "1000").toInt,
      chunkOverlap     = env("CHUNK_OVERLAP",       "200").toInt,
      batchSize        = env("CHROMA_BATCH_SIZE",   "10").toInt,
    )
    validate(cfg)
    cfg
  }

  private def validate(cfg: AppConfig): Unit = {
    require(cfg.grpcPort > 0,       s"GRPC_PORT must be > 0, got ${cfg.grpcPort}")
    require(cfg.httpPort > 0,       s"HEALTH_HTTP_PORT must be > 0, got ${cfg.httpPort}")
    require(cfg.chunkSize > 0,      s"CHUNK_SIZE must be > 0, got ${cfg.chunkSize}")
    require(cfg.chunkOverlap >= 0,  s"CHUNK_OVERLAP must be >= 0, got ${cfg.chunkOverlap}")
    require(cfg.batchSize > 0,      s"CHROMA_BATCH_SIZE must be > 0, got ${cfg.batchSize}")
    require(cfg.chromaHost.nonEmpty, "CHROMA_HOST must not be empty")
  }

  private def env(key: String, default: String): String =
    sys.env.getOrElse(key, default)
}
