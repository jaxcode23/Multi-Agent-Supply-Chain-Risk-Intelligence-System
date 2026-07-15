package health

import zio._
import zio.http._
import zio.json.EncoderOps
import config.AppConfig

object HealthRoutes {

  private val version = "1.0.0"

  private def healthResponse: UIO[Response] =
    ZIO.succeed(
      Response.json(
        Map("status" -> "ok", "service" -> "scala-ingestion", "version" -> version).toJson
      )
    )

  private def checkChroma(cfg: AppConfig): ZIO[Client, Nothing, (String, String)] = {
    val url = s"https://${cfg.chromaHost}/api/v1/heartbeat"
    val request = Request
      .get(URL.decode(url).getOrElse(URL.empty))
      .addHeader("X-Chroma-Token", cfg.chromaApiKey)

    ZIO.serviceWithZIO[Client] { client =>
      client.request(request).flatMap { resp =>
        if (resp.status.isSuccess) ZIO.succeed("chroma" -> "ok")
        else ZIO.succeed("chroma" -> s"unavailable: HTTP ${resp.status.code}")
      }.catchAll(e => ZIO.succeed("chroma" -> s"unavailable: ${e.getMessage}"))
    }
  }

  val app: Http[AppConfig with Client, Nothing, Request, Response] =
    Http.collect[Request] {
      case Method.GET -> Root / "health" =>
        healthResponse

      case Method.GET -> Root / "ready" =>
        for {
          cfg      <- ZIO.service[AppConfig]
          chromaDep <- checkChroma(cfg)
          deps      = Map(chromaDep)
          allOk     = deps.values.forall(_ == "ok")
          status    = if (allOk) "ok" else "not_ready"
          code      = if (allOk) Status.Ok else Status.ServiceUnavailable
          body      = Map(
            "status"       -> status,
            "service"      -> "scala-ingestion",
            "version"      -> version,
            "dependencies" -> Map(chromaDep).toJson,
          ).toJson
        } yield Response.json(body).copy(status = code)
    }
}
