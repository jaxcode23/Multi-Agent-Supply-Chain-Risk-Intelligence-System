import pytest
from agents.analysis.risk_scoring import calculate_risk_score, RISK_KEYWORDS


class TestCalculateRiskScore:
    def test_returns_high_score_for_explosion(self):
        assert calculate_risk_score("explosion at factory") == 95

    def test_returns_high_score_for_fire(self):
        assert calculate_risk_score("fire reported at warehouse") == 90

    def test_returns_score_for_strike(self):
        assert calculate_risk_score("workers go on strike") == 85

    def test_returns_score_for_flood(self):
        assert calculate_risk_score("flood damages supply route") == 80

    def test_returns_score_for_riot(self):
        assert calculate_risk_score("riot at distribution center") == 75

    def test_returns_score_for_shutdown(self):
        assert calculate_risk_score("plant shutdown announced") == 70

    def test_returns_default_low_score_for_neutral_text(self):
        assert calculate_risk_score("normal operations continuing") == 20

    def test_returns_default_for_empty_string(self):
        assert calculate_risk_score("") == 20

    def test_case_insensitive_matching(self):
        assert calculate_risk_score("EXPLOSION") == 95
        assert calculate_risk_score("Flood") == 80

    def test_substring_matching(self):
        assert calculate_risk_score("firefighters respond to call") == 90

    def test_earlier_keyword_takes_precedence(self):
        scores = list(RISK_KEYWORDS.values())
        assert len(scores) == len(set(scores)), "risk keywords must have unique scores"

    def test_score_bounds(self):
        for text in ["fire", "strike", "flood", "riot", "shutdown", "explosion", "normal"]:
            score = calculate_risk_score(text)
            assert 0 <= score <= 100, f"score {score} out of range for '{text}'"
