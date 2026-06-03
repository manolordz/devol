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
