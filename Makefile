.PHONY: test test-go test-py test-scala test-rust test-frontend test-integration test-smoke test-all

# ── Language-level test suites ────────────────────────────────────────────────

test-go:
	cd scrapers && go test ./...

test-py:
	cd backend && PYTHONPATH=$$(pwd) python -m pytest tests/ -v

test-scala:
	cd ingestion && sbt test

test-rust:
	cd runner && cargo test

test-frontend-unit:
	cd frontend && npx vitest run

test-frontend-e2e:
	cd frontend && npx playwright test

# ── Cross-service tests ───────────────────────────────────────────────────────

test-contract:
	PYTHONPATH=backend python -m pytest tests/contract/ -v

test-integration:
	cd backend && PYTHONPATH=$$(pwd) python -m pytest tests/ -m integration -v

test-smoke:
	python -m pytest tests/smoke/ -v -s

# ── Unified test runner ───────────────────────────────────────────────────────

test-all:
	python tests/system/test_pipeline.py

# ── CI aligned ────────────────────────────────────────────────────────────────

test-ci: test-go test-py test-rust test-contract
