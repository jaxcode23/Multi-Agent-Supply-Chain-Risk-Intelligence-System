def process_intelligence_data(raw_data: dict) -> dict:
    enriched = dict(raw_data)
    enriched["processed"] = True
    return enriched


def batch_process(records: list[dict]) -> list[dict]:
    return [process_intelligence_data(r) for r in records]
