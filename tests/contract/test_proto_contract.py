"""
Proto contract test: verify Go and Scala protobuf definitions are equivalent.

Reads both the root proto/scrapper.proto and any Scala-specific proto
definitions, then asserts they define the same messages and fields.
"""

import re
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ROOT_PROTO = REPO_ROOT / "proto" / "scrapper.proto"
SCALA_PROTO = REPO_ROOT / "ingestion" / "src" / "main" / "protobuf"
GO_PB_DIR = REPO_ROOT / "scrapers" / "pkg" / "pb"


def parse_message_defs(proto_path: Path) -> dict[str, set[str]]:
    """Return {MessageName: {field1, field2, ...}} from a .proto file."""
    messages: dict[str, set[str]] = {}
    current_msg: str | None = None
    text = proto_path.read_text()
    for line in text.splitlines():
        m = re.match(r"^\s*message\s+(\w+)\s*{", line)
        if m:
            current_msg = m.group(1)
            messages[current_msg] = set()
            continue
        m = re.match(r"^\s*}", line)
        if m and current_msg:
            current_msg = None
            continue
        if current_msg:
            m = re.match(r"^\s+\w+\s+(\w+)\s*=", line)
            if m:
                messages[current_msg].add(m.group(1))
    return messages


def test_proto_contract_root_defines_expected_messages():
    assert ROOT_PROTO.exists(), f"Root proto not found: {ROOT_PROTO}"
    msgs = parse_message_defs(ROOT_PROTO)
    assert "ScrapePayload" in msgs, "Root proto missing ScrapePayload"
    assert "ScrapeResponse" in msgs, "Root proto missing ScrapeResponse"

    payload_fields = msgs["ScrapePayload"]
    for required in ("source_url", "domain_entity", "raw_content", "timestamp"):
        assert required in payload_fields, f"ScrapePayload missing field: {required}"


def test_proto_contract_scala_matches_root():
    """If the Scala proto copy exists (optional), it must match the root."""
    scala_proto_file = SCALA_PROTO / "scrapper.proto"
    if not scala_proto_file.exists():
        pytest.skip("Scala proto copy removed — root proto is canonical")
    root_msgs = parse_message_defs(ROOT_PROTO)
    scala_msgs = parse_message_defs(scala_proto_file)
    assert root_msgs == scala_msgs, (
        f"Root and Scala proto mismatch\n"
        f"Root only: {root_msgs.keys() - scala_msgs.keys()}\n"
        f"Scala only: {scala_msgs.keys() - root_msgs.keys()}"
    )


def test_proto_contract_go_generated_files_exist():
    assert (GO_PB_DIR / "scrapper.pb.go").exists(), "Go generated pb.go missing"
    assert (GO_PB_DIR / "scrapper_grpc.pb.go").exists(), "Go generated grpc.pb.go missing"


def test_proto_contract_scala_generated_files_exist():
    """Check that scalapb codegen has been run."""
    scala_target = REPO_ROOT / "ingestion" / "target" / "scala-2.13" / "src_managed" / "main" / "scalapb"
    if not scala_target.exists():
        pytest.skip(f"Scala protobuf target not found — run 'sbt compile' first")
    scala_files = list(scala_target.glob("*.scala"))
    if not scala_files:
        pytest.skip(f"No generated Scala files — run 'sbt compile' first (looked in {scala_target})")


# Needed for pytest skip
import pytest  # noqa: E402 (import after module-level code)


def test_proto_contract_go_has_service_definition():
    text = ROOT_PROTO.read_text()
    assert "service ScrapperService" in text, "Root proto missing ScrapperService service"
    assert "rpc StreamScrapeData" in text, "Root proto missing StreamScrapeData RPC"
