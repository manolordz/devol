export interface ProductResult {
  title: string;
  url: string;
  image_url?: string;
  price?: number;
  currency: string;
  store_id: string;
  store_name: string;
  similarity_score: number;
  similarity_reason: string;
}

export interface SearchResponse {
  query_string: string;
  exact: ProductResult[];
  similar: ProductResult[];
  stores_searched: string[];
  errors: Record<string, string>;
}

export interface Favorite {
  id: number;
  store_id: string;
  store_name: string;
  product_title: string;
  product_url: string;
  image_url?: string;
  price?: number;
  currency: string;
  notes?: string;
  interested_clients?: string;
  created_at: string;
  search_query?: string;
}

export interface Store {
  id: string;
  name: string;
  url: string;
  type: string;
  search_url_template: string;
  enabled: boolean;
}

export interface SearchField {
  id: string;
  label: string;
  label_es: string;
  type: "text" | "select" | "range";
  options?: string[];
  enabled: boolean;
}

export interface SavedSearchSummary {
  id: number;
  name?: string;
  query_string: string;
  fields: Record<string, string | number>;
  store_ids: string[];
  exact_count: number;
  similar_count: number;
  created_at: string;
}

export interface SavedSearchDetail {
  id: number;
  name?: string;
  query_string: string;
  fields: Record<string, string | number>;
  store_ids: string[];
  results: { exact: ProductResult[]; similar: ProductResult[] };
  created_at: string;
}
