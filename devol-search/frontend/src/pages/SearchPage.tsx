import { useState } from "react";
import { searchProducts } from "../api/client";
import SearchForm from "../components/SearchForm";
import ResultsGrid from "../components/ResultsGrid";
import type { SearchResponse } from "../types";

export default function SearchPage() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(
    fields: Record<string, string | number>,
    storeIds: string[]
  ) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await searchProducts(fields, storeIds);
      setResults(res);
    } catch (e) {
      setError("Error al conectar con el servidor. ¿Está corriendo el backend?");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1">Buscar artículos</h1>
        <p className="text-sm text-gray-400">
          Búsqueda simultánea en tiendas japonesas de artículos pre-loved
        </p>
      </div>

      <div className="bg-gray-50 p-6">
        <SearchForm onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {results && !isLoading && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400 px-2">
              {results.exact.length + results.similar.length} resultado
              {results.exact.length + results.similar.length !== 1 ? "s" : ""}{" "}
              en {results.stores_searched.length} tienda
              {results.stores_searched.length !== 1 ? "s" : ""}
            </span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <ResultsGrid results={results} />
        </div>
      )}
    </div>
  );
}
