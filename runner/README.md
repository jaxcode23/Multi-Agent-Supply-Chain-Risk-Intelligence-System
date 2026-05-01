# 🦀 Rust System Runner

**Language:** Rust | **Role:** Polyglot Service Orchestrator

Reads `runner.toml` from the project root and spawns all services (Go, Scala, Python, Next.js) as child processes. Acts as a single entrypoint for the entire stack — `cargo run` starts everything.

---

## How It Works

1. Reads and parses `runner.toml` (TOML format).
2. For each `[services.<name>]` entry, resolves the command path.
3. On Windows: uses `where.exe` to find `.cmd`/`.bat`/`.exe` wrappers — handles npm, sbt, and Coursier installs without hardcoded paths.
4. On Linux/macOS: uses the command as-is from the system PATH.
5. Spawns all services as child processes with `stdout`/`stderr` inherited.
6. Main thread loops indefinitely until `Ctrl-C`.

---

## `runner.toml` Format

```toml
[services.go-gateway]
path    = "./scrapers"
command = "go"
args    = ["run", "cmd/api/main.go"]

[services.scala-gateway]
path    = "./ingestion"
command = "sbt"
args    = ["run"]

[services.intelligence]
path    = "./backend"
command = "python"
args    = ["-m", "uvicorn", "main:app", "--reload", "--port", "8000"]

[services.interface]
path    = "./frontend"
command = "npm"
args    = ["run", "dev"]
```

---

## Running

```bash
# Start all services from the repo root
cd runner && cargo run

# Or from the project root (runner.toml auto-detected in parent)
cargo run --manifest-path runner/Cargo.toml
```

---

## Code Status

| File | Status |
|---|---|
| `src/main.rs` | ✅ Production — cross-platform, zero hardcoded paths |
