"""
Docker Compose smoke test — verifies all infrastructure services are healthy.

Usage:
    docker compose up -d
    python -m pytest tests/smoke/ -v

Requires: docker, docker-compose, requests, pymongo, neo4j
"""

import os
import subprocess
import time
from pathlib import Path

import pytest
import requests

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def _compose_cmd():
    return ["docker", "compose"]


@pytest.fixture(scope="session")
def docker_services():
    """Ensure docker-compose services are running before tests."""
    cmd = _compose_cmd() + ["ps", "--format", "json"]
    try:
        result = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, timeout=30)
        if not result.stdout.strip():
            pytest.skip("Docker Compose not running — start with 'docker compose up -d'")
    except FileNotFoundError:
        pytest.skip("Docker not available on this host")
    yield


class TestChromaDBHealth:
    def test_heartbeat(self, docker_services):
        url = os.getenv("CHROMA_URL", "http://localhost:8000")
        for attempt in range(10):
            try:
                resp = requests.get(f"{url}/api/v1/heartbeat", timeout=5)
                assert resp.status_code == 200
                return
            except requests.RequestException:
                time.sleep(2)
        pytest.fail("ChromaDB did not respond after 20s")


class TestNeo4jHealth:
    def test_bolt_port_open(self, docker_services):
        import socket
        host = os.getenv("NEO4J_HOST", "localhost")
        port = int(os.getenv("NEO4J_BOLT_PORT", "7687"))
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        try:
            result = sock.connect_ex((host, port))
            assert result == 0, f"Neo4j Bolt port {port} not open"
        finally:
            sock.close()

    def test_http_port_open(self, docker_services):
        import socket
        host = os.getenv("NEO4J_HOST", "localhost")
        port = int(os.getenv("NEO4J_HTTP_PORT", "7474"))
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        try:
            result = sock.connect_ex((host, port))
            assert result == 0, f"Neo4j HTTP port {port} not open"
        finally:
            sock.close()


class TestMongoDBHealth:
    def test_connection(self, docker_services):
        try:
            from pymongo import MongoClient
        except ImportError:
            pytest.skip("pymongo not installed")
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        try:
            info = client.server_info()
            assert "ok" in info
        finally:
            client.close()


class TestAllServices:
    def test_network_exists(self, docker_services):
        cmd = ["docker", "network", "ls", "--format", "{{.Name}}"]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        assert "supply-chain-net" in result.stdout, "Expected supply-chain-net network"

    def test_containers_running(self, docker_services):
        cmd = _compose_cmd() + ["ps", "--format", "{{.Name}}"]
        result = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, timeout=10)
        assert result.returncode == 0
        names = result.stdout.strip().splitlines()
        assert len(names) >= 1, "Expected at least one running container"
