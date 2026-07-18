import zio.test._
import config.AppConfig

object AppConfigSpec extends ZIOSpecDefault {

  def spec = suite("AppConfig")(
    test("AppConfig case class fields are assignable and accessible") {
      val cfg = AppConfig(
        grpcPort = 9091,
        httpPort = 9092,
        chromaHost = "localhost",
        chromaApiKey = "test-key",
        chromaTenant = "test-tenant",
        chromaDatabase = "test-db",
        chromaCollection = "test-collection",
        chunkSize = 500,
        chunkOverlap = 100,
        batchSize = 5,
      )
      assertTrue(
        cfg.grpcPort == 9091,
        cfg.chromaHost == "localhost",
        cfg.chunkSize == 500,
        cfg.batchSize == 5,
      )
    },
    test("can be constructed manually") {
      val cfg = AppConfig(
        grpcPort = 9090,
        httpPort = 9091,
        chromaHost = "api.trychroma.com",
        chromaApiKey = "",
        chromaTenant = "",
        chromaDatabase = "supply-chain-db",
        chromaCollection = "supply_chain_intel",
        chunkSize = 1000,
        chunkOverlap = 200,
        batchSize = 10,
      )
      assertTrue(cfg.grpcPort == 9090 && cfg.chunkSize == 1000 && cfg.httpPort == 9091)
    },
    test("default values are sensible") {
      val cfg = AppConfig(
        grpcPort = 9090, httpPort = 9091, chromaHost = "", chromaApiKey = "",
        chromaTenant = "", chromaDatabase = "", chromaCollection = "",
        chunkSize = 1000, chunkOverlap = 200, batchSize = 10,
      )
      assertTrue(cfg.batchSize == 10 && cfg.chunkOverlap == 200)
    },
  )
}
