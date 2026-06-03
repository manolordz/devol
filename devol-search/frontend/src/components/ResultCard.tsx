import { useState } from "react";
import { createFavorite } from "../api/client";
import type { ProductResult } from "../types";

const JPY_TO_MXN = 0.115;

const STORE_COLORS: Record<string, string> = {
  ookura: "bg-indigo-500",
  allu: "bg-rose-500",
};

function getStoreColor(storeId: string): string {
  return STORE_COLORS[storeId] ?? "bg-gray-500";
}

interface Props {
  product: ProductResult;
  searchQuery?: string;
}

export default function ResultCard({ product, searchQuery }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [clients, setClients] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mxnPrice =
    product.price ? Math.round(product.price * JPY_TO_MXN) : null;

  async function handleSaveFavorite() {
    setSaving(true);
    try {
      await createFavorite({
        store_id: product.store_id,
        store_name: product.store_name,
        product_title: product.title,
        product_url: product.url,
        image_url: product.image_url,
        price: product.price,
        currency: product.currency,
        notes: notes || undefined,
        interested_clients: clients || undefined,
        search_query: searchQuery,
      });
      setSaved(true);
      setTimeout(() => {
        setShowModal(false);
        setSaved(false);
      }, 1000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card flex flex-col overflow-hidden group">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl font-serif font-bold text-gray-200">
                {product.store_name.charAt(0)}
              </span>
            </div>
          )}
          {/* Similarity badge */}
          <div className="absolute top-2 left-2">
            {product.similarity_score >= 0.8 ? (
              <span className="badge-exact">Exacto</span>
            ) : (
              <span className="badge-similar">Similar</span>
            )}
          </div>
          {/* Heart button */}
          <button
            onClick={() => setShowModal(true)}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white shadow-sm transition-all duration-200 hover:scale-110"
            title="Guardar en favoritos"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill={saved ? "#C4896F" : "none"}
              stroke={saved ? "#C4896F" : "currentColor"}
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          {/* Store badge */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${getStoreColor(product.store_id)}`}
            />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {product.store_name}
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-medium leading-snug line-clamp-2 flex-1">
            {product.title}
          </p>

          {/* Price */}
          {product.price && (
            <div>
              <p className="text-base font-semibold">
                ¥{product.price.toLocaleString("ja-JP")}
              </p>
              {mxnPrice && (
                <p className="text-xs text-gray-400">≈ ${mxnPrice.toLocaleString()} MXN</p>
              )}
            </div>
          )}

          {/* Similarity reason */}
          {product.similarity_score < 0.8 && product.similarity_reason && (
            <p className="text-xs text-amber-600 italic">{product.similarity_reason}</p>
          )}

          {/* CTA */}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-center btn-secondary text-xs py-2"
          >
            Ver en tienda →
          </a>
        </div>
      </div>

      {/* Save Favorite Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white w-full max-w-md shadow-xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="font-serif text-lg font-semibold">
                Guardar favorito
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 p-3 space-y-1">
              <p className="text-xs text-gray-500">{product.store_name}</p>
              <p className="text-sm font-medium">{product.title}</p>
              {product.price && (
                <p className="text-sm text-gray-600">
                  ¥{product.price.toLocaleString("ja-JP")}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
                Notas
              </label>
              <textarea
                className="input-field resize-none h-20"
                placeholder="Condición, detalles especiales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
                Clientes interesados
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ana, Carlos, María..."
                value={clients}
                onChange={(e) => setClients(e.target.value)}
              />
            </div>

            <button
              onClick={handleSaveFavorite}
              disabled={saving || saved}
              className="btn-primary w-full"
            >
              {saved ? "¡Guardado!" : saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
