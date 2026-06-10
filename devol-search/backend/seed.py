import json
from pathlib import Path

from sqlmodel import Session, select

from database import engine
from models.db import SearchFieldConfig, StoreConfig

CONFIG_DIR = Path(__file__).parent / "config"


def seed_defaults():
    """Populate StoreConfig/SearchFieldConfig from the bundled JSON config
    files the first time the app runs against a fresh database. After that,
    the Admin UI manages these tables directly."""
    with Session(engine) as session:
        if session.exec(select(StoreConfig)).first() is None:
            with open(CONFIG_DIR / "stores.json") as f:
                for item in json.load(f):
                    session.add(StoreConfig(**item))

        if session.exec(select(SearchFieldConfig)).first() is None:
            with open(CONFIG_DIR / "search_fields.json") as f:
                for item in json.load(f):
                    options = item.pop("options", None)
                    session.add(
                        SearchFieldConfig(
                            options_json=json.dumps(options) if options is not None else None,
                            **item,
                        )
                    )

        session.commit()
