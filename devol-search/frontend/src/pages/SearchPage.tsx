import { useMemo, useState } from "react";
import { createSavedSearch, searchProducts } from "../api/client";
import PrintableResults from "../components/PrintableResults";
import ResultsGrid from "../components/ResultsGrid";
import SearchForm from "../components/SearchForm";
import type { ProductResult, SearchResponse } from "../types";
import { productKey } from "../utils";

type SortOption = "relevance" | "price_asc" | "price_desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
];

function sortProducts(products: ProductResult[], sortBy: SortOption): ProductResult[] {
  if (sortBy === "relevance") return products;
  const arr = [...products];
  arr.sort((a, b) => {
    if (a.price == null && b.price == null) return 0;
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return sortBy === "price_asc" ? a.price - b.price : b.price - a.price;
  });
  return arr;
}

export default function SearchPage() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFields, setLastFields] = useState<Record<string, string | number>>({});
  const [lastStoreIds, setLastStoreIds] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [storeFilter, setStoreFilter] = useState<Set<string>>(new Set());

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savingResults, setSavingResults] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const allProducts: ProductResult[] = results
    ? [...results.exact, ...results.similar]
    : [];

  // Stores actually present in the current results, in order of first appearance.
  const availableStores = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allProducts) {
      if (!map.has(p.store_id)) map.set(p.store_id, p.store_name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [results]);

  const filteredExact = useMemo(() => {
    if (!results) return [];
    const filtered =
      storeFilter.size === 0
        ? results.exact
        : results.exact.filter((p) => storeFilter.has(p.store_id));
    return sortProducts(filtered, sortBy);
  }, [results, storeFilter, sortBy]);

  const filteredSimilar = useMemo(() => {
    if (!results) return [];
    const filtered =
      storeFilter.size === 0
        ? results.similar
        : results.similar.filter((p) => storeFilter.has(p.store_id));
    return sortProducts(filtered, sortBy);
  }, [results, storeFilter, sortBy]);

  const displayResults: SearchResponse | null = results
    ? { ...results, exact: filteredExact, similar: filteredSimilar }
    : null;

  const visibleProducts = [...filteredExact, ...filteredSimilar];

  async function handleSearch(
    fields: Record<string, string | number>,
    storeIds: string[]
  ) {
    setIsLoading(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await searchProducts(fields, storeIds);
      setResults(res);
      setLastFields(fields);
      setLastStoreIds(storeIds);
      // All results are selected for the PDF by default
      setSelectedKeys(new Set([...res.exact, ...res.similar].map(productKey)));
      // Reset filters/sort for the new result set
      setSortBy("relevance");
      setStoreFilter(new Set());
    } catch (e) {
      setError("Error al conectar con el servidor. ¿Está corriendo el backend?");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSelect(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const p of visibleProducts) next.add(productKey(p));
      return next;
    });
  }

  function deselectAll() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      for (const p of visibleProducts) next.delete(productKey(p));
      return next;
    });
  }

  function toggleStoreFilter(storeId: string) {
    setStoreFilter((prev) => {
      // An empty set means "show all stores" — start from the full list
      // so toggling one store off keeps the rest visible.
      const base =
        prev.size === 0 ? new Set(availableStores.map((s) => s.id)) : new Set(prev);
      if (base.has(storeId)) {
        base.delete(storeId);
      } else {
        base.add(storeId);
      }
      // If everything ends up selected again, go back to "show all" (empty set)
      if (base.size === availableStores.length) return new Set();
      return base;
    });
  }

  function handleGeneratePdf() {
    const originalTitle = document.title;
    document.title = "PDF";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }

  async function handleSaveResults() {
    if (!results) return;
    setSavingResults(true);
    setSavedMessage(null);
    try {
      await createSavedSearch({
        name: saveName.trim() || undefined,
        query_string: results.query_string,
        fields: lastFields,
        store_ids: lastStoreIds,
        results: { exact: results.exact, similar: results.similar },
      });
      setShowSaveModal(false);
      setSaveName("");
      setSavedMessage('Resultados guardados correctamente. Puedes verlos en "Guardados".');
    } catch {
      setSavedMessage("Error al guardar los resultados.");
    } finally {
      setSavingResults(false);
    }
  }

  const selectedProducts = allProducts.filter((p) =>
    selectedKeys.has(productKey(p))
  );
  const selectedVisibleCount = visibleProducts.filter((p) =>
    selectedKeys.has(productKey(p))
  ).length;
  const allVisibleSelected =
    visibleProducts.length > 0 && selectedVisibleCount === visibleProducts.length;

  const isStoreActive = (storeId: string) =>
    storeFilter.size === 0 || storeFilter.has(storeId);

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

      {savedMessage && (
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          {savedMessage}
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

          {allProducts.length > 0 && (
            <div className="space-y-4 mb-6">
              {/* Sort & filter controls */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <span className="font-semibold tracking-wider text-gray-500 uppercase">
                    Ordenar
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="input-field !w-auto py-1.5 text-xs"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                {availableStores.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      Tienda
                    </span>
                    {availableStores.map((store) => {
                      const active = isStoreActive(store.id);
                      return (
                        <button
                          key={store.id}
                          onClick={() => toggleStoreFilter(store.id)}
                          className={`px-3 py-1 text-xs font-medium border transition-colors duration-200 ${
                            active
                              ? "border-ink bg-ink text-white"
                              : "border-gray-200 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          {store.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selection / actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={allVisibleSelected ? deselectAll : selectAll}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  {allVisibleSelected ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
                <span className="text-xs text-gray-400">
                  {selectedVisibleCount} de {visibleProducts.length} seleccionados
                </span>
                <div className="flex-1" />
                <button
                  onClick={handleGeneratePdf}
                  disabled={selectedKeys.size === 0}
                  className="btn-secondary text-xs py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Generar PDF
                </button>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="btn-primary text-xs py-2 px-4"
                >
                  Guardar resultados
                </button>
              </div>
            </div>
          )}

          <ResultsGrid
            results={displayResults}
            selectable
            selectedKeys={selectedKeys}
            onToggleSelect={toggleSelect}
          />
        </div>
      )}

      {/* Print-only view: only the selected items show up here */}
      {results && (
        <PrintableResults
          products={selectedProducts}
          queryString={results.query_string}
        />
      )}

      {/* Save Results Modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowSaveModal(false)}
        >
          <div className="bg-white w-full max-w-md shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-serif text-lg font-semibold">Guardar resultados</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Se guardarán {results?.exact.length ?? 0} resultado
              {(results?.exact.length ?? 0) !== 1 ? "s" : ""} exacto
              {(results?.exact.length ?? 0) !== 1 ? "s" : ""} y{" "}
              {results?.similar.length ?? 0} similar
              {(results?.similar.length ?? 0) !== 1 ? "es" : ""} de esta búsqueda.
            </p>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
                Nombre (opcional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={results?.query_string || "Nombre de la búsqueda"}
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>

            <button
              onClick={handleSaveResults}
              disabled={savingResults}
              className="btn-primary w-full"
            >
              {savingResults ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
