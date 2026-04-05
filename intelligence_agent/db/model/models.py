from datetime import datetime
from typing import Optional
import hashlib
from pydantic import BaseModel, Field, computed_field

class IntelAnalysis(BaseModel):
    """Sub-document for the AI analysis results."""
    risk_score: int
    priority: str  # 'low', 'medium', 'high'
    escalate_to_analysis: bool

class IntelDocument(BaseModel):
    """The main document schema for the 'raw_intel' collection."""
    
    # Raw Data
    url: str
    source: str = "newsapi"
    title: str
    description: Optional[str] = None
    raw_text: str
    published_at: datetime
    
    # Metadata
    ingested_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Analysis Data (Embedded Sub-document)
    analysis: IntelAnalysis

    @computed_field(alias="_id")
    def id_hash(self) -> str:
        """
        Auto-generates the MongoDB _id based on the URL.
        This guarantees strict deduplication at the database level.
        """
        return hashlib.md5(self.url.encode("utf-8")).hexdigest()

    def to_mongo(self):
        """Prepares the dictionary for MongoDB insertion (handling alias)."""
        return self.model_dump(by_alias=True)