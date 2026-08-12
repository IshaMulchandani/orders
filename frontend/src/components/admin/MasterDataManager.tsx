import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { apiClient } from "@/api/client";
import Confirm from "@/components/Confirm";

interface MasterDataItem {
  id: number;
  name: string;
  created_at: string;
}

interface ImportResult {
  created_count: number;
  created: string[];
  skipped: { row: number; value?: string; reason: string }[];
}

interface MasterDataManagerProps {
  resourceLabel: string; // e.g. "Client"
  resourceLabelPlural: string; // e.g. "Clients"
  apiBasePath: string; // e.g. "/clients"
}

/**
 * Generic list/add/inline-edit/delete/CSV-import UI for a simple
 * name-only master data resource. Client and Product are structurally
 * identical (same fields, same permission rules, same CSV shape), so
 * this one component drives both — see pages/admin/Clients.tsx and
 * pages/admin/Products.tsx, which are just prop wrappers around it.
 * Adding a third similar resource later means adding a page, not a
 * new component.
 */
export default function MasterDataManager({
  resourceLabel,
  resourceLabelPlural,
  apiBasePath,
}: MasterDataManagerProps) {
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MasterDataItem | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load(q = "") {
    setLoading(true);
    const { data } = await apiClient.get(`${apiBasePath}/`, { params: q ? { search: q } : {} });
    setItems(Array.isArray(data) ? data : (data.results ?? []));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`${apiBasePath}/`, { name: newName });
      setNewName("");
      load(search);
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] ?? `Could not add ${resourceLabel.toLowerCase()}.`);
    }
  }

  function startEdit(item: MasterDataItem) {
    setEditingId(item.id);
    setEditingName(item.name);
  }

  async function saveEdit(id: number) {
    setError(null);
    try {
      await apiClient.patch(`${apiBasePath}/${id}/`, { name: editingName });
      setEditingId(null);
      load(search);
    } catch (err: any) {
      setError(err.response?.data?.name?.[0] ?? "Could not save changes.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await apiClient.delete(`${apiBasePath}/${deleteTarget.id}/`);
    setDeleteTarget(null);
    load(search);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await apiClient.post(`${apiBasePath}/import/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(data);
      load(search);
    } catch {
      setError("Import failed. Please check the file and try again.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy">{resourceLabelPlural}</h1>
        <label className="cursor-pointer text-sm text-navy-light hover:underline">
          {importing ? "Importing…" : "Import CSV"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={importing}
          />
        </label>
      </div>

      {importResult && (
        <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3 text-sm">
          <p className="font-medium text-navy">
            Imported {importResult.created_count} {resourceLabelPlural.toLowerCase()}.
          </p>
          {importResult.skipped.length > 0 && (
            <ul className="mt-2 space-y-1 text-gray-600">
              {importResult.skipped.map((s, i) => (
                <li key={i}>
                  Row {s.row}
                  {s.value ? ` ("${s.value}")` : ""}: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex gap-3">
        <input
          type="text"
          required
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`${resourceLabel} name`}
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-navy px-4 py-2 text-white hover:bg-navy-light">
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={`Search ${resourceLabelPlural.toLowerCase()}…`}
        className="mt-4 w-full rounded border border-gray-300 px-3 py-2"
      />

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="divide-y divide-gray-100 rounded border border-gray-200">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  {editingId === item.id ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(item.id)}
                      className="w-full rounded border border-gray-300 px-2 py-1"
                    />
                  ) : (
                    <span className="block truncate">{item.name}</span>
                  )}
                </div>
                <div className="flex shrink-0 gap-3">
                  {editingId === item.id ? (
                    <>
                      <button onClick={() => saveEdit(item.id)} className="text-navy-light hover:underline">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-gray-500 hover:underline">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(item)} className="text-navy-light hover:underline">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(item)} className="text-red-600 hover:underline">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="px-3 py-4 text-center text-gray-400">
                No {resourceLabelPlural.toLowerCase()} yet.
              </p>
            )}
          </div>
        )}
      </div>

      <Confirm
        open={!!deleteTarget}
        title={`Delete ${resourceLabel}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
