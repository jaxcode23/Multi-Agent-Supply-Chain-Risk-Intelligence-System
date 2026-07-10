#!/usr/bin/env python3
"""System integration test — runs all component test suites and reports results."""

import subprocess
import sys
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

VENV_PYTHON = sys.executable
results = []

COMPONENTS = [
    ("Python Backend", [VENV_PYTHON, "-m", "pytest", "-x", "tests/"], "backend"),
    ("Go Scrapers", ["go", "test", "./..."], "scrapers"),
    ("Scala Ingestion", ["sbt", "test"], "ingestion"),
    ("Rust Runner", ["cargo", "test"], "runner"),
    ("Proto Contract", [VENV_PYTHON, "-m", "pytest", "-x", "tests/contract/", "-v"], "."),
    ("Python Integration", [VENV_PYTHON, "-m", "pytest", "-x", "tests/", "-m", "integration", "-v"], "backend"),
    ("Docker Smoke", [VENV_PYTHON, "-m", "pytest", "-x", "tests/smoke/", "-v"], "."),
]


def run_component(name, cmd, workdir_rel):
    workdir = REPO_ROOT / workdir_rel
    print(f"\n{'='*60}")
    print(f"  [{name}]")
    print(f"  $ {' '.join(cmd)}  (in {workdir_rel}/)")
    print(f"{'='*60}")
    try:
        r = subprocess.run(
            cmd,
            cwd=workdir,
            capture_output=True,
            text=True,
            timeout=300,
        )
        ok = r.returncode == 0
        if ok:
            print(f"  ✓ PASS")
        else:
            print(f"  ✗ FAIL (exit code {r.returncode})")
        # Show last 10 lines of output
        tail = (r.stdout + r.stderr).strip().splitlines()[-10:]
        for line in tail:
            print(f"    | {line}")
        results.append((name, ok))
        return ok
    except subprocess.TimeoutExpired:
        print(f"  ✗ TIMEOUT (>300s)")
        results.append((name, False))
        return False
    except FileNotFoundError as e:
        print(f"  ✗ SKIP — {e}")
        results.append((name, False))
        return False


def main():
    os.chdir(REPO_ROOT)
    failures = 0

    # 1. Python backend
    if not run_component(*COMPONENTS[0]):
        failures += 1

    # 2. Go scrapers
    if not run_component(*COMPONENTS[1]):
        failures += 1

    # 3. Scala ingestion
    if not run_component(*COMPONENTS[2]):
        failures += 1

    # 4. Rust runner
    if not run_component(*COMPONENTS[3]):
        failures += 1

    # Summary
    print(f"\n{'='*60}")
    print(f"  SYSTEM INTEGRATION TEST SUMMARY")
    print(f"{'='*60}")
    for name, ok in results:
        status = "✓" if ok else "✗"
        print(f"  {status} {name}")
    print(f"\n  {len(results) - failures}/{len(results)} suites passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
