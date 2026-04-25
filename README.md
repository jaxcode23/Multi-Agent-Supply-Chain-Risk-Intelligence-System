# 🌍 Multi-Agent Supply Chain Risk Intelligence System

![Python](https://img.shields.io/badge/python-%233776AB.svg?style=for-the-badge&logo=python&logoColor=white)
![Scala](https://img.shields.io/badge/scala-%23DC322F.svg?style=for-the-badge&logo=scala&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)

**Multi-Agent Supply Chain Risk Intelligence System** is an enterprise-grade AI platform designed to monitor global news, social media, and logistics data in real-time to detect and mitigate supply chain disruptions before they happen.

> Global Monitoring → Intelligence Extraction → Automated Risk Mitigation.

---

## 🚀 Why This Architecture?

Traditional supply chain monitoring often suffers from data loss during peak loads and lacks the flexibility to scale intelligence gathering independently. Our system solves this with a resilient polyglot approach:

- 🛡️ **Zero Single Points of Failure:** If the AI backend times out, the Scala ingestion service continues to catch and store data. No intelligence is ever lost.
- 📈 **Independent Scaling:** Scale your intelligence gathering to 10,000+ suppliers by simply deploying more scrapers, without affecting the core API or UI.
- 🧠 **Language Isolation:** We use the best tool for every job: Python for flexible AI/ML, Scala for type-safe high-throughput streams, and TypeScript for a premium UI.

---

## 🏗️ How it Works

The system utilizes a specialized pipeline designed for maximum resilience:

1. **Scrapers (Python):** Native Playwright/Scrapy extractors gather unstructured text from web and logistics feeds.
2. **Ingestion (Scala):** A high-throughput JVM pipeline validates and cleanses data before buffering it into MongoDB.
3. **AI Backend (Python):** FastAPI orchestrates LLM-powered Analysis Agents that use Neo4j to find alternative suppliers when risks are detected.
4. **Frontend (Next.js):** A premium TypeScript dashboard provides real-time visibility and one-click mitigation.



---

## 📂 Repository Structure

The repository is organized into distinct microservice directories to ensure clean dependencies and easy orchestration:

- `frontend/` — UI Layer (Next.js / Tailwind / TypeScript)
- `backend/` — AI Orchestration & API Gateway (FastAPI)
- `scrapers/` — Intelligence Gathering (Python Spiders)
- `ingestion/` — Data Pipeline (Scala / JVM)
- `infrastructure/` — DevOps (Docker Compose, Seed Scripts)

---

## 🚀 Getting Started

Ensure you have Docker and Docker Compose installed:

```bash
# 1. Clone the repository
git clone https://github.com/AshikaM07/Multi-Agent-Supply-Chain-Risk-Intelligence-System
cd Multi-Agent-Supply-Chain-Risk-Intelligence-System

# 2. Set up environment variables
cp .env.example .env

# 3. Launch the enterprise stack
docker-compose up -d
```

---

## 🎯 Target MVP Scope

Phase 1 focus ensures a resilient foundation for real-time risk intelligence:
- ✅ **Dynamic Ingestion:** Real-time news processing using the Scala pipeline.
- ✅ **Risk Scoring Agent:** Automated LLM-based threat assessment.
- ✅ **Alternative Sourcing:** Active Neo4j graph traversal for supplier redundancy.
- ✅ **Unified Dashboard:** Real-time visualization of supply chain health.

---

## 📄 License & Author

**Author**: Built by @pd241008 @jaxcode23  
**License**: MIT 
