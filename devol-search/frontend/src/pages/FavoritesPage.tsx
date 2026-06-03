import { useEffect, useState } from "react";
import { getFavorites } from "../api/client";
import FavoriteCard from "../components/FavoriteCard";
import type { Favorite } from "../types";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFavorites()
      .then(setFavorites)
      .finally(() => setLoading(false));
  }, []);

  const filtered = favorites.filter((f) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      f.product_title.toLowerCase().includes(q) ||
      f.store_name.toLowerCase().includes(q) ||
      (f.interested_clients ?? "").toLowerCase().includes(q) ||
      (f.notes ?? "").toLowerCase().includes(q)
    );
  });

  function handleDelete(id: number) {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  function handleUpdate(updated: Favorite) {
    setFavorites((prev) =>
      prev.map((f) => (f.id === updated.id ? updated : f))
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold mb-1">Favoritos</h1>
          <p className="text-sm text-gray-400">
            {favorites.length} artículo{favorites.length !== 1 ? "s" : ""} guardado
            {favorites.length !== 1 ? "s" : ""}
          </p>
        </div>
        <input
          type="text"
          className="input-field max-w-xs"
          placeholder="Filtrar por nombre, tienda, cliente..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading && (
        <div className="text-center py-16 text-sm text-gray-400">
          Cargando favoritos...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            {filter
              ? "Sin resultados para ese filtro"
              : "Aún no tienes favoritos guardados"}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((fav) => (
          <FavoriteCard
            key={fav.id}
            favorite={fav}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  );
}
