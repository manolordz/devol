import { useState } from "react";
import { deleteFavorite, updateFavorite } from "../api/client";
import type { Favorite } from "../types";

const JPY_TO_MXN = 0.115;

interface Props {
  favorite: Favorite;
  onDelete: (id: number) => void;
  onUpdate: (updated: Favorite) => void;
}

export default function FavoriteCard({ favorite, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(favorite.notes ?? "");
  const [clients, setClients] = useState(favorite.interested_clients ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mxnPrice = favorite.price
    ? Math.round(favorite.price * JPY_TO_MXN)
    : null;

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateFavorite(favorite.id, {
        notes,
        interested_clients: clients,
      });
      onUpdate(updated);
      setEditing(false);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteFavorite(favorite.id);
      onDelete(favorite.id);
    } catch {
      // silent
    }
  }

  const dateStr = new Date(favorite.created_at).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="card flex gap-4 p-4">
      {/* Image */}
      <div className="w-24 h-24 flex-shrink-0 bg-gray-50 overflow-hidden">
        {favorite.image_url ? (
          <img
            src={favorite.image_url}
            alt={favorite.product_title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-serif font-bold text-gray-200">
              {favorite.store_name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {favorite.store_name} · {dateStr}
            </p>
            <p className="text-sm font-medium leading-snug mt-0.5">
              {favorite.product_title}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditing(!editing)}
              className="text-xs text-gray-400 hover:text-ink px-2 py-1 border border-gray-200 hover:border-ink transition-colors"
            >
              {editing ? "Cancelar" : "Editar"}
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 border border-gray-200 hover:border-red-300 transition-colors"
              >
                ✕
              </button>
            ) : (
              <button
                onClick={handleDelete}
                className="text-xs text-white bg-red-500 px-2 py-1 transition-colors"
              >
                Confirmar
              </button>
            )}
          </div>
        </div>

        {favorite.price && (
          <div>
            <span className="text-sm font-semibold">
              ¥{favorite.price.toLocaleString("ja-JP")}
            </span>
            {mxnPrice && (
              <span className="text-xs text-gray-400 ml-2">
                ≈ ${mxnPrice.toLocaleString()} MXN
              </span>
            )}
          </div>
        )}

        {editing ? (
          <div className="space-y-2 pt-1">
            <textarea
              className="input-field text-xs resize-none h-16"
              placeholder="Notas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <input
              type="text"
              className="input-field text-xs"
              placeholder="Clientes interesados (separados por coma)"
              value={clients}
              onChange={(e) => setClients(e.target.value)}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-4"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        ) : (
          <>
            {favorite.notes && (
              <p className="text-xs text-gray-600 bg-gray-50 px-2 py-1.5 italic">
                {favorite.notes}
              </p>
            )}
            {favorite.interested_clients && (
              <p className="text-xs text-gray-500">
                <span className="font-medium">Clientes:</span>{" "}
                {favorite.interested_clients}
              </p>
            )}
            <a
              href={favorite.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-terracota hover:underline"
            >
              Ver en tienda →
            </a>
          </>
        )}
      </div>
    </div>
  );
}
