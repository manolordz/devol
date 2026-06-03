from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import search, stores, favorites, fields

JPY_TO_MXN = 0.115


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Devol Search API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api")
app.include_router(stores.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")
app.include_router(fields.router, prefix="/api")


@app.get("/api/config")
def get_config():
    return {"jpy_to_mxn": JPY_TO_MXN}
