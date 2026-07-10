from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from gateway.api.api_router import main_api_router

app = FastAPI(
    title="Supply Chain Risk AI",
    description="Multi-Agent Supply Chain Risk Intelligence System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_api_router)


@app.get("/")
def root():
    return {"message": "Supply Chain Risk AI Backend is running"}
