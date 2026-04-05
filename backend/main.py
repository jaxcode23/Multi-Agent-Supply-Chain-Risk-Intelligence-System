
from fastapi import FastAPI
from gateway.api.api_router import main_api_router

app = FastAPI(
    title="Supply Chain Risk AI",
    version="1.0.0"
)

# Base API entry
app.include_router(main_api_router)

@app.get("/")
def root():
    return {"message": "Supply Chain Risk AI Backend is running"}
