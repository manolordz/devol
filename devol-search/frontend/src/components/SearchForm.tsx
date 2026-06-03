import { useEffect, useState } from "react";
import { getFields, getStores } from "../api/client";
import type { SearchField, Store } from "../types";

interface Props {
  onSearch: (
    fields: Record<string, string | number>,
    storeIds: string[]
  ) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: Props) {
  const [fields, setFields] = useState<SearchField[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());

  useEffect(() => {
    getFields().then((f) => setFields(f.filter((x) => x.enabled)));
    getStores().then((s) => {
      const enabled = s.filter((x) => x.enabled);
      setStores(enabled);
      setSelectedStores(new Set(enabled.map((x) => x.id)));
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(values, Array.from(selectedStores));
  }

  function toggleStore(id: string) {
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
              {field.label_es}
            </label>
            {field.type === "select" ? (
              <select
                className="input-field"
                value={(values[field.id] as string) ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.id]: e.target.value }))
                }
              >
                {field.options?.map((opt) => (
                  <option key={opt} value={opt === "Any" ? "" : opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "range" ? (
              <input
                type="number"
                className="input-field"
                placeholder={field.id === "price_min" ? "0" : "∞"}
                value={(values[field.id] as number) ?? ""}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [field.id]: e.target.value ? Number(e.target.value) : "",
                  }))
                }
              />
            ) : (
              <input
                type="text"
                className="input-field"
                placeholder={field.label}
                value={(values[field.id] as string) ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.id]: e.target.value }))
                }
              />
            )}
          </div>
        ))}
      </div>

      {stores.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase mb-2">
            Tiendas
          </p>
          <div className="flex flex-wrap gap-3">
            {stores.map((store) => (
              <label
                key={store.id}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedStores.has(store.id)}
                  onChange={() => toggleStore(store.id)}
                  className="w-4 h-4 accent-terracota"
                />
                <span className="text-sm font-medium">{store.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading
            ? `Buscando en ${selectedStores.size} tienda${selectedStores.size !== 1 ? "s" : ""}...`
            : "Buscar"}
        </button>
        {isLoading && (
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 bg-terracota rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
