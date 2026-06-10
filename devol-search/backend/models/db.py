import json
from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel


class Favorite(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    store_id: str
    store_name: str
    product_title: str
    product_url: str
    image_url: Optional[str] = None
    price: Optional[float] = None
    currency: str = "JPY"
    notes: Optional[str] = None
    interested_clients: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    search_query: Optional[str] = None


class SavedSearch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: Optional[str] = None
    query_string: str = ""
    fields_json: str = "{}"
    store_ids_json: str = "[]"
    results_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class StoreConfig(SQLModel, table=True):
    """A configured search store (e.g. OKURA, ALLU).

    Stored in the database (instead of config/stores.json) so that the
    Admin page can add/edit/delete stores in production, where the
    deployment's filesystem is read-only.
    """

    id: str = Field(primary_key=True)
    name: str
    url: str
    type: str
    search_url_template: str = ""
    enabled: bool = True

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "url": self.url,
            "type": self.type,
            "search_url_template": self.search_url_template,
            "enabled": self.enabled,
        }


class SearchFieldConfig(SQLModel, table=True):
    """A configurable search field (e.g. brand, model, size).

    Stored in the database (instead of config/search_fields.json) for the
    same reason as StoreConfig.
    """

    id: str = Field(primary_key=True)
    label: str
    label_es: str
    type: str
    options_json: Optional[str] = None
    enabled: bool = True

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "label_es": self.label_es,
            "type": self.type,
            "options": json.loads(self.options_json) if self.options_json else None,
            "enabled": self.enabled,
        }
