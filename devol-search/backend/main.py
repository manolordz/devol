import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import search, stores, favorites, fields, saved_searches
from seed import seed_defaults

JPY_TO_MXN = 0.115


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_defaults()
    yield


app = FastAPI(title="Devol Search API", lifespan=lifespan)

# Extra origins (e.g. a deployed frontend URL) can be supplied via env var as
# a comma-separated list, in addition to the local dev servers.
extra_origins = [
    o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        *extra_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api")
app.include_router(stores.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(fields.router, prefix="/api")
app.include_router(saved_searches.router, prefix="/api")


@app.get("/api/config")
def get_config():
    return {"jpy_to_mxn": JPY_TO_MXN}
