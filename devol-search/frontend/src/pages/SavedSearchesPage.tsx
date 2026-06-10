import { useEffect, useState } from "react";
import { deleteSavedSearch, getSavedSearch, getSavedSearches } from "../api/client";
import ResultsGrid from "../components/ResultsGrid";
import type { SavedSearchDetail, SavedSearchSummary } from "../types";

export default function SavedSearchesPage() {
  const [items, setItems] = useState<SavedSearchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SavedSearchDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    getSavedSearches()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function handleView(id: number) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const d = await getSavedSearch(id);
      setDetail(d);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta búsqueda guardada?")) return;
    await deleteSavedSearch(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
    }
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1">Búsquedas guardadas</h1>
        <p className="text-sm text-gray-400">
          {items.length} búsqueda{items.length !== 1 ? "s" : ""} guardada
          {items.length !== 1 ? "s" : ""}
        </p>
      </div>

      {loading && (
        <div className="text-center py-16 text-sm text-gray-400">Cargando...</div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">Aún no has guardado ninguna búsqueda</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  {formatDate(item.created_at)}
                </p>
                <p className="text-sm font-medium mt-0.5">
                  {item.name || item.query_string || "Búsqueda sin nombre"}
                </p>
                {item.name && item.query_string && (
                  <p className="text-xs text-gray-400 mt-0.5">"{item.query_string}"</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {item.exact_count} exacto{item.exact_count !== 1 ? "s" : ""} ·{" "}
                  {item.similar_count} similar{item.similar_count !== 1 ? "es" : ""}
                  {item.store_ids.length > 0 ? ` · ${item.store_ids.join(", ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleView(item.id)}
                  className="text-xs text-gray-500 hover:text-ink px-2 py-1 border border-gray-200 hover:border-ink transition-colors duration-200"
                >
                  {openId === item.id ? "Ocultar" : "Ver"}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 border border-gray-200 hover:border-red-300 transition-colors duration-200"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {openId === item.id && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {loadingDetail && (
                  <p className="text-sm text-gray-400">Cargando resultados...</p>
                )}
                {!loadingDetail && detail && (
                  <ResultsGrid
                    results={{
                      query_string: detail.query_string,
                      exact: detail.results.exact ?? [],
                      similar: detail.results.similar ?? [],
                      stores_searched: detail.store_ids,
                      errors: {},
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
