import type { ProductResult, SearchResponse } from "../types";
import ResultCard from "./ResultCard";

interface Props {
  results: SearchResponse | null;
}

export default function ResultsGrid({ results }: Props) {
  if (!results) return null;

  const { exact, similar, query_string, errors } = results;
  const hasErrors = Object.keys(errors).length > 0;
  const hasResults = exact.length > 0 || similar.length > 0;

  return (
    <div className="space-y-10">
      {hasErrors && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Advertencia:</span>{" "}
          {Object.entries(errors).map(([store, err]) => (
            <span key={store}>
              {store}: {err}.{" "}
            </span>
          ))}
        </div>
      )}

      {!hasResults && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            Sin resultados en las tiendas seleccionadas
          </p>
          {query_string && (
            <p className="text-gray-300 text-xs mt-1">
              Búsqueda: "{query_string}"
            </p>
          )}
        </div>
      )}

      {exact.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-6">
            <h2 className="section-title">Resultados exactos</h2>
            <span className="text-xs text-gray-400">{exact.length} encontrado{exact.length !== 1 ? "s" : ""}</span>
          </div>
          <ProductGrid products={exact} query={query_string} />
        </section>
      )}

      {similar.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-6">
            <h2 className="section-title">
              {exact.length === 0
                ? "No encontramos el artículo exacto, pero estos podrían interesarte"
                : "Resultados similares"}
            </h2>
            <span className="text-xs text-gray-400">{similar.length} encontrado{similar.length !== 1 ? "s" : ""}</span>
          </div>
          <ProductGrid products={similar} query={query_string} />
        </section>
      )}
    </div>
  );
}

function ProductGrid({
  products,
  query,
}: {
  products: ProductResult[];
  query: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product, i) => (
        <ResultCard key={`${product.store_id}-${product.url}-${i}`} product={product} searchQuery={query} />
      ))}
    </div>
  );
}
