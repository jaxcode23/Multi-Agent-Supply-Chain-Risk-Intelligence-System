#!/usr/bin/env python3
"""
Docker Compose Smoke Test — verifies all services are healthy.

Usage:
    docker compose up -d
    python scripts/smoke_test.py

    # Skip teardown after test:
    python scripts/smoke_test.py --no-teardown

Requires: requests (pip install requests)
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package required. Install with: pip install requests")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent
TIMEOUT = 5
MAX_RETRIES = 15
RETRY_DELAY = 2

# Service definitions: (name, url, expected_status)
SERVICES = [
    ("backend", "http://localhost:8000/health", 200),
    ("go-scraper", "http://localhost:8080/health", 200),
    ("scala-ingestion", "http://localhost:9091/health", 200),
    ("frontend", "http://localhost:3000", 200),
]

# Infrastructure checks
INFRA = [
    ("mongodb", "mongodb://localhost:27017"),
    ("neo4j-bolt", "localhost:7687"),
    ("chromadb", "http://localhost:8000/api/v1/heartbeat"),
]


def _compose(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["docker", "compose", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=30,
    )


def check_service(name: str, url: str, expected: int) -> tuple[str, bool, str]:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(url, timeout=TIMEOUT)
            if resp.status_code == expected:
                return (name, True, f"HTTP {resp.status_code}")
            return (name, False, f"HTTP {resp.status_code} (expected {expected})")
        except requests.ConnectionError:
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
                continue
            return (name, False, "Connection refused")
        except requests.Timeout:
            return (name, False, "Timeout")
        except Exception as e:
            return (name, False, str(e))
    return (name, False, "Max retries exceeded")


def check_mongodb() -> tuple[str, bool, str]:
    try:
        from pymongo import MongoClient
        client = MongoClient(
            "mongodb://localhost:27017",
            serverSelectionTimeoutMS=3000,
        )
        client.admin.command("ping")
        client.close()
        return ("mongodb", True, "Connected")
    except ImportError:
        return ("mongodb", False, "pymongo not installed")
    except Exception as e:
        return ("mongodb", False, str(e))


def check_neo4j() -> tuple[str, bool, str]:
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)
    try:
        result = sock.connect_ex(("localhost", 7687))
        if result == 0:
            return ("neo4j-bolt", True, "Port open")
        return ("neo4j-bolt", False, f"Port closed (code {result})")
    except Exception as e:
        return ("neo4j-bolt", False, str(e))
    finally:
        sock.close()


def check_chromadb() -> tuple[str, bool, str]:
    return check_service("chromadb", "http://localhost:8000/api/v1/heartbeat", 200)


def run_smoke_test(teardown: bool = True) -> int:
    print("=" * 60)
    print("  Shadow Network — Docker Compose Smoke Test")
    print("=" * 60)

    # Check docker compose is running
    print("\n[1/3] Checking Docker Compose status...")
    result = _compose("ps", "--format", "json")
    if not result.stdout.strip():
        print("  ERROR: No containers running. Start with: docker compose up -d")
        return 1
    print(f"  Found running containers")

    # Check infrastructure
    print("\n[2/3] Checking infrastructure...")
    infra_results: list[tuple[str, bool, str]] = []
    for name, _ in INFRA:
        if name == "mongodb":
            infra_results.append(check_mongodb())
        elif name == "neo4j-bolt":
            infra_results.append(check_neo4j())
        elif name == "chromadb":
            infra_results.append(check_chromadb())

    # Check services
    print("\n[3/3] Checking service health endpoints...")
    service_results: list[tuple[str, bool, str]] = []
    for name, url, expected in SERVICES:
        service_results.append(check_service(name, url, expected))

    # Print results
    print("\n" + "=" * 60)
    print("  Results")
    print("=" * 60)

    all_results = infra_results + service_results
    passed = 0
    failed = 0

    for name, ok, detail in all_results:
        status = "PASS" if ok else "FAIL"
        icon = "+" if ok else "X"
        print(f"  [{icon}] {name:20s} {status:6s}  {detail}")
        if ok:
            passed += 1
        else:
            failed += 1

    print("-" * 60)
    print(f"  Total: {passed + failed}  Passed: {passed}  Failed: {failed}")
    print("=" * 60)

    if teardown:
        print("\nTearing down Docker Compose...")
        _compose("down")

    return 1 if failed > 0 else 0


def main():
    parser = argparse.ArgumentParser(description="Shadow Network smoke test")
    parser.add_argument(
        "--no-teardown",
        action="store_true",
        help="Skip docker compose down after test",
    )
    args = parser.parse_args()
    exit_code = run_smoke_test(teardown=not args.no_teardown)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
