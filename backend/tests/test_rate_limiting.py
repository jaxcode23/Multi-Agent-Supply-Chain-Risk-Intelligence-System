from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


class TestRateLimiting:
    def test_health_not_rate_limited(self):
        for _ in range(5):
            resp = client.get("/health")
            assert resp.status_code == 200

    def test_risk_endpoint_returns_success(self):
        resp = client.post(
            "/risks/analyze",
            json={
                "supplier_name": "Test",
                "headline": "test headline",
                "risk_score": 50,
            },
        )
        assert resp.status_code in (200, 429)

    def test_request_id_header_present(self):
        resp = client.get("/health")
        assert "X-Request-ID" in resp.headers
        assert len(resp.headers["X-Request-ID"]) > 0

    def test_custom_request_id_forwarded(self):
        resp = client.get("/health", headers={"X-Request-ID": "my-custom-id"})
        assert resp.headers["X-Request-ID"] == "my-custom-id"
