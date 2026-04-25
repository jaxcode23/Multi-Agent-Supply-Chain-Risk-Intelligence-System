import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.Behaviors
import akka.stream.scaladsl.{Flow, Sink, Source}
import domain.RawScraperPayload
import transforms.DataCleaner

object Main {
  def main(args: Array[String]): Unit = {
    implicit val system: ActorSystem[Nothing] = ActorSystem(Behaviors.empty, "IngestionPipeline")

    println("🚀 Starting the Scala Ingestion Pipeline...")

    // 1. The Source: Simulating a firehose of raw scraper data
    val simulatedDataSource = Source(1 to 5).map { i =>
      RawScraperPayload(
        source = if (i % 2 == 0) "twitter" else "logistics_api",
        raw_text = s"   URGENT: Port delay detected in region $i...    \n ",
        timestamp = System.currentTimeMillis()
      )
    }

    // 2. The Sink: What happens at the end of the pipeline
    // Right now we just print it. Later, this Sink will push the data to your Python backend.
    val consoleSink = Sink.foreach(println)

    // 3. WIRING IT ALL TOGETHER
    // Source -> Flow -> Sink
    val runnableGraph = simulatedDataSource
      .via(DataCleaner.normalizeDataFlow)
      .to(consoleSink)

    // Execute the pipeline
    runnableGraph.run()

    // 4. Start Akka HTTP Server on Port 8080
    import akka.http.scaladsl.Http
    import akka.http.scaladsl.server.Directives._
    import scala.util.{Failure, Success}

    val route =
      path("health") {
        get {
          complete("Scala Ingestion Pipeline is Running!")
        }
      }

    val bindingFuture = Http().newServerAt("0.0.0.0", 8080).bind(route)
    bindingFuture.onComplete {
      case Success(bound) =>
        println(s"🌍 Scala API Server dynamically bound and running on port ${bound.localAddress.getPort} (http://localhost:8080) 🚀")
      case Failure(e) =>
        println(s"❌ Server could not start! ${e.getMessage}")
        system.terminate()
    }(system.executionContext)
  }
}