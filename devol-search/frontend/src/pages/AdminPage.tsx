import { useEffect, useState } from "react";
import {
  createField,
  createStore,
  deleteField,
  deleteStore,
  getFields,
  getStores,
  updateField,
  updateStore,
} from "../api/client";
import type { SearchField, Store } from "../types";

type Tab = "stores" | "fields";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("stores");

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold mb-1">Administración</h1>
        <p className="text-sm text-gray-400">
          Gestiona tiendas y campos de búsqueda
        </p>
      </div>

      <div className="flex border-b border-gray-200">
        {(["stores", "fields"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-terracota text-terracota"
                : "border-transparent text-gray-500 hover:text-ink"
            }`}
          >
            {t === "stores" ? "Tiendas" : "Campos de búsqueda"}
          </button>
        ))}
      </div>

      {tab === "stores" ? <StoresTab /> : <FieldsTab />}
    </div>
  );
}

/* ─── STORES TAB ─── */

function StoresTab() {
  const [stores, setStores] = useState<Store[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);

  useEffect(() => {
    getStores().then(setStores);
  }, []);

  async function handleToggle(store: Store) {
    const updated = await updateStore(store.id, { enabled: !store.enabled });
    setStores((prev) => prev.map((s) => (s.id === store.id ? updated : s)));
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta tienda?")) return;
    await deleteStore(id);
    setStores((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleSave(data: Store) {
    if (editStore) {
      const updated = await updateStore(data.id, data);
      setStores((prev) => prev.map((s) => (s.id === data.id ? updated : s)));
      setEditStore(null);
    } else {
      const created = await createStore(data);
      setStores((prev) => [...prev, created]);
      setShowAdd(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Agregar tienda
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {["Nombre", "URL", "Tipo", "Estado", ""].map((h) => (
                <th key={h} className="text-left py-3 px-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stores.map((store) => (
              <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3 font-medium">{store.name}</td>
                <td className="py-3 px-3 text-gray-500 text-xs max-w-xs truncate">
                  {store.url}
                </td>
                <td className="py-3 px-3">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 font-mono">
                    {store.type}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => handleToggle(store)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      store.enabled ? "bg-terracota" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        store.enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </td>
                <td className="py-3 px-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditStore(store)}
                      className="text-xs text-gray-500 hover:text-ink"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      className="text-xs text-gray-400 hover:text-red-500"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showAdd || editStore) && (
        <StoreModal
          initial={editStore ?? undefined}
          onSave={handleSave}
          onClose={() => {
            setShowAdd(false);
            setEditStore(null);
          }}
        />
      )}
    </div>
  );
}

function StoreModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Store;
  onSave: (store: Store) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Store>(
    initial ?? {
      id: "",
      name: "",
      url: "",
      type: "shopify",
      search_url_template: "",
      enabled: true,
    }
  );

  function set(key: keyof Store, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Modal title={initial ? "Editar tienda" : "Nueva tienda"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="ID (único)">
          <input
            className="input-field"
            value={form.id}
            disabled={!!initial}
            onChange={(e) => set("id", e.target.value)}
          />
        </Field>
        <Field label="Nombre">
          <input className="input-field" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="URL base">
          <input className="input-field" value={form.url} onChange={(e) => set("url", e.target.value)} />
        </Field>
        <Field label="Tipo">
          <select className="input-field" value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="shopify">shopify</option>
            <option value="playwright">playwright</option>
            <option value="static">static</option>
          </select>
        </Field>
        <Field label="URL de búsqueda (usa {query})">
          <input
            className="input-field"
            value={form.search_url_template}
            onChange={(e) => set("search_url_template", e.target.value)}
          />
        </Field>
        <button onClick={() => onSave(form)} className="btn-primary w-full">
          Guardar
        </button>
      </div>
    </Modal>
  );
}

/* ─── FIELDS TAB ─── */

function FieldsTab() {
  const [fields, setFields] = useState<SearchField[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    getFields().then(setFields);
  }, []);

  async function handleToggle(field: SearchField) {
    const updated = await updateField(field.id, { enabled: !field.enabled });
    setFields((prev) => prev.map((f) => (f.id === field.id ? updated : f)));
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este campo?")) return;
    await deleteField(id);
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleAdd(data: SearchField) {
    const created = await createField(data);
    setFields((prev) => [...prev, created]);
    setShowAdd(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          + Agregar campo
        </button>
      </div>

      <div className="space-y-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className="flex items-center gap-4 p-3 border border-gray-100 hover:border-gray-200"
          >
            <div className="flex-1 grid grid-cols-3 gap-4 text-sm">
              <span className="font-medium">{field.label_es}</span>
              <span className="text-gray-400 font-mono text-xs">{field.type}</span>
              <span className="text-gray-400 text-xs">
                {field.options?.join(", ")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggle(field)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  field.enabled ? "bg-terracota" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    field.enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <button
                onClick={() => handleDelete(field.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <FieldModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

function FieldModal({
  onSave,
  onClose,
}: {
  onSave: (field: SearchField) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SearchField>({
    id: "",
    label: "",
    label_es: "",
    type: "text",
    options: [],
    enabled: true,
  });
  const [optionsStr, setOptionsStr] = useState("");

  function set(key: keyof SearchField, value: string | boolean | string[]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const field = { ...form };
    if (form.type === "select") {
      field.options = optionsStr.split(",").map((s) => s.trim()).filter(Boolean);
    }
    onSave(field);
  }

  return (
    <Modal title="Nuevo campo" onClose={onClose}>
      <div className="space-y-3">
        <Field label="ID (único)">
          <input className="input-field" value={form.id} onChange={(e) => set("id", e.target.value)} />
        </Field>
        <Field label="Label (inglés)">
          <input className="input-field" value={form.label} onChange={(e) => set("label", e.target.value)} />
        </Field>
        <Field label="Label (español)">
          <input className="input-field" value={form.label_es} onChange={(e) => set("label_es", e.target.value)} />
        </Field>
        <Field label="Tipo">
          <select className="input-field" value={form.type} onChange={(e) => set("type", e.target.value as SearchField["type"])}>
            <option value="text">text</option>
            <option value="select">select</option>
            <option value="range">range</option>
          </select>
        </Field>
        {form.type === "select" && (
          <Field label="Opciones (separadas por coma)">
            <input
              className="input-field"
              value={optionsStr}
              onChange={(e) => setOptionsStr(e.target.value)}
              placeholder="Any, Gold, Silver..."
            />
          </Field>
        )}
        <button onClick={handleSave} className="btn-primary w-full">
          Guardar
        </button>
      </div>
    </Modal>
  );
}

/* ─── Shared UI ─── */

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-ink">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wider text-gray-500 uppercase mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
