import type {
  Favorite,
  ProductResult,
  SearchField,
  SearchResponse,
  Store,
} from "../types";

const BASE_URL = "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Search
export function searchProducts(
  fields: Record<string, string | number>,
  store_ids: string[]
): Promise<SearchResponse> {
  return request("/api/search", {
    method: "POST",
    body: JSON.stringify({ fields, store_ids }),
  });
}

// Stores
export function getStores(): Promise<Store[]> {
  return request("/api/stores");
}

export function createStore(store: Omit<Store, never>): Promise<Store> {
  return request("/api/stores", {
    method: "POST",
    body: JSON.stringify(store),
  });
}

export function updateStore(id: string, data: Partial<Store>): Promise<Store> {
  return request(`/api/stores/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteStore(id: string): Promise<void> {
  return request(`/api/stores/${id}`, { method: "DELETE" });
}

// Favorites
export function getFavorites(): Promise<Favorite[]> {
  return request("/api/favorites");
}

export function createFavorite(data: {
  store_id: string;
  store_name: string;
  product_title: string;
  product_url: string;
  image_url?: string;
  price?: number;
  currency: string;
  notes?: string;
  interested_clients?: string;
  search_query?: string;
}): Promise<Favorite> {
  return request("/api/favorites", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateFavorite(
  id: number,
  data: { notes?: string; interested_clients?: string }
): Promise<Favorite> {
  return request(`/api/favorites/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteFavorite(id: number): Promise<void> {
  return request(`/api/favorites/${id}`, { method: "DELETE" });
}

// Fields
export function getFields(): Promise<SearchField[]> {
  return request("/api/fields");
}

export function createField(field: SearchField): Promise<SearchField> {
  return request("/api/fields", {
    method: "POST",
    body: JSON.stringify(field),
  });
}

export function updateField(
  id: string,
  data: Partial<SearchField>
): Promise<SearchField> {
  return request(`/api/fields/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteField(id: string): Promise<void> {
  return request(`/api/fields/${id}`, { method: "DELETE" });
}

// Config
export function getConfig(): Promise<{ jpy_to_mxn: number }> {
  return request("/api/config");
}
