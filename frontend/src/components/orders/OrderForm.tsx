import { useState, type FormEvent } from "react";
import { apiClient } from "@/api/client";
import SearchableDropdown from "@/components/SearchableDropdown";
import type { DraftOrderLine, OrderDetail } from "@/types/order";

interface NamedOption {
  id: number;
  name: string;
}

interface OrderFormProps {
  mode: "create" | "edit";
  orderId?: number;
  initialClient?: NamedOption | null;
  initialLines?: DraftOrderLine[];
  onSaved: (order: OrderDetail) => void;
  onCancel?: () => void;
}

const MAX_LINES = 50;

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function emptyLine(): DraftOrderLine {
  return { key: makeKey(), product: null, quantity: "1", price: "" };
}

async function fetchClients(query: string): Promise<NamedOption[]> {
  const { data } = await apiClient.get("/clients/", { params: query ? { search: query } : {} });
  return data;
}

async function fetchProducts(query: string): Promise<NamedOption[]> {
  const { data } = await apiClient.get("/products/", { params: query ? { search: query } : {} });
  return data;
}

function lineTotal(line: DraftOrderLine): number {
  const qty = Number(line.quantity);
  const price = Number(line.price);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return qty * price;
}

/**
 * Shared order create/edit form. OrderNew and OrderDetail (when
 * editing) both render this with different initial values and submit
 * targets — line management, validation, and total calculation live
 * here once instead of being duplicated between "new" and "edit".
 */
export default function OrderForm({
  mode,
  orderId,
  initialClient,
  initialLines,
  onSaved,
  onCancel,
}: OrderFormProps) {
  const [client, setClient] = useState<NamedOption | null>(initialClient ?? null);
  const [lines, setLines] = useState<DraftOrderLine[]>(initialLines?.length ? initialLines : [emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(key: string, patch: Partial<DraftOrderLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => (prev.length >= MAX_LINES ? prev : [...prev, emptyLine()]));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!client) {
      setError("Please select a client.");
      return;
    }
    for (const line of lines) {
      if (!line.product) {
        setError("Every line needs a product selected.");
        return;
      }
      if (!line.quantity || Number(line.quantity) < 1) {
        setError("Quantity must be at least 1 on every line.");
        return;
      }
      if (!line.price || Number(line.price) < 0.01) {
        setError("Price must be at least ₹0.01 on every line.");
        return;
      }
    }

    const payload = {
      client: client.id,
      lines: lines.map((l) => ({
        product: l.product!.id,
        quantity: Number(l.quantity),
        price: l.price,
      })),
    };

    setSubmitting(true);
    try {
      const { data } =
        mode === "create"
          ? await apiClient.post("/orders/", payload)
          : await apiClient.put(`/orders/${orderId}/`, payload);
      onSaved(data);
    } catch (err: any) {
      const detail = err.response?.data;
      setError(
        typeof detail === "string"
          ? detail
          : (detail?.lines?.[0] ?? detail?.client?.[0] ?? detail?.detail ?? "Could not save the order."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold text-navy">{mode === "create" ? "New Order" : "Edit Order"}</h1>

      <div className="mt-4">
        <label className="block text-sm text-gray-600">Client</label>
        <div className="mt-1">
          <SearchableDropdown
            value={client}
            onChange={setClient}
            fetchOptions={fetchClients}
            getLabel={(c) => c.name}
            getKey={(c) => c.id}
            placeholder="Search clients…"
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            Items ({lines.length}/{MAX_LINES})
          </h2>
          <button
            type="button"
            onClick={addLine}
            disabled={lines.length >= MAX_LINES}
            className="text-sm text-navy-light hover:underline disabled:text-gray-300"
          >
            + Add item
          </button>
        </div>

        <div className="mt-2 space-y-3">
          {lines.map((line) => (
            <div
              key={line.key}
              className="flex flex-col gap-2 rounded border border-gray-200 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <SearchableDropdown
                  value={line.product}
                  onChange={(product) => updateLine(line.key, { product })}
                  fetchOptions={fetchProducts}
                  getLabel={(p) => p.name}
                  getKey={(p) => p.id}
                  placeholder="Search products…"
                />
              </div>
              <input
                type="number"
                min={1}
                step={1}
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                placeholder="Qty"
                className="w-full rounded border border-gray-300 px-3 py-2 sm:w-24"
              />
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={line.price}
                onChange={(e) => updateLine(line.key, { price: e.target.value })}
                placeholder="Price"
                className="w-full rounded border border-gray-300 px-3 py-2 sm:w-28"
              />
              <div className="w-full text-right text-sm text-gray-600 sm:w-24">
                ₹{lineTotal(line).toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                disabled={lines.length <= 1}
                className="text-sm text-red-600 hover:underline disabled:text-gray-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-6">
        <p className="text-lg font-semibold text-navy">Total: ₹{grandTotal.toFixed(2)}</p>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-navy px-5 py-2 text-white hover:bg-navy-light disabled:opacity-50"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create Order" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
