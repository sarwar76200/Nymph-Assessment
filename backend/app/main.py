from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import (
    auth,
    conversations,
    dashboard,
    documents,
    messages,
    organizations,
)
from app.schemas import PlaceholderResponse

app = FastAPI(
    title="Nymph Customer Support API",
    version="0.1.0",
    description="Placeholder REST API for the customer support dashboard.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.119.1:3000",
        "https://nymph-assessment.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_model=PlaceholderResponse, tags=["System"])
async def root() -> PlaceholderResponse:
    return PlaceholderResponse()


@app.get("/health", response_model=PlaceholderResponse, tags=["System"])
async def health_check() -> PlaceholderResponse:
    return PlaceholderResponse()


API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(organizations.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(conversations.router, prefix=API_PREFIX)
app.include_router(messages.router, prefix=API_PREFIX)
app.include_router(documents.router, prefix=API_PREFIX)
