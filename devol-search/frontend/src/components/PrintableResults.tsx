import type { ProductResult } from "../types";

const JPY_TO_MXN = 0.115;

interface Props {
  products: ProductResult[];
  queryString: string;
}

export default function PrintableResults({ products, queryString }: Props) {
  const date = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="hidden print:block print-section p-8">
      <div className="flex items-center justify-between border-b-2 border-ink pb-4 mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-widest">DEVOL</h1>
        <div className="text-right text-sm text-gray-500">
          <p>Resultados de búsqueda</p>
          <p>{date}</p>
        </div>
      </div>

      {queryString && (
        <p className="text-sm text-gray-600 mb-2">
          Búsqueda: <span className="font-medium">"{queryString}"</span>
        </p>
      )}
      <p className="text-xs text-gray-400 mb-6">
        {products.length} artículo{products.length !== 1 ? "s" : ""} seleccionado
        {products.length !== 1 ? "s" : ""}
      </p>

      <div className="grid grid-cols-2 gap-4">
        {products.map((p, i) => {
          const mxnPrice = p.price ? Math.round(p.price * JPY_TO_MXN) : null;
          return (
            <div
              key={`${p.store_id}-${p.url}-${i}`}
              className="border border-gray-300 p-3 flex gap-3 break-inside-avoid"
            >
              <div className="w-20 h-20 flex-shrink-0 bg-gray-50 overflow-hidden">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xl font-serif font-bold text-gray-300">
                      {p.store_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 text-sm min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {p.store_name}
                </p>
                <p className="font-medium leading-snug">{p.title}</p>
                {p.price && (
                  <p className="font-semibold mt-1">
                    ¥{p.price.toLocaleString("ja-JP")}{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      (≈ ${mxnPrice?.toLocaleString()} MXN)
                    </span>
                  </p>
                )}
                <p className="text-xs mt-1">
                  {p.similarity_score >= 0.8
                    ? "Exacto"
                    : `Similar — ${p.similarity_reason}`}
                </p>
                <p className="text-[10px] text-gray-400 break-all mt-1">{p.url}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
