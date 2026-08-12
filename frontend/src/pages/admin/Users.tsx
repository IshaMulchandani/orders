import { useEffect, useState, type FormEvent } from "react";
import { apiClient } from "@/api/client";
import type { Role } from "@/types/user";

interface Invitation {
  id: number;
  email: string;
  role: Role;
  invited_by_email: string | null;
  invite_link: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const ROLES: Role[] = ["PARTNER", "SALESMAN", "ACCOUNTANT", "PACKAGING"];

export default function AdminUsers() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("SALESMAN");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function loadInvitations() {
    const { data } = await apiClient.get("/invitations/");
    setInvitations(data.results ?? data);
    setLoading(false);
  }

  useEffect(() => {
    loadInvitations();
  }, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post("/invitations/", { email, role });
      setEmail("");
      loadInvitations();
    } catch (err: any) {
      setError(err.response?.data?.email?.[0] ?? "Could not create invitation.");
    }
  }

  async function handleRevoke(id: number) {
    setError(null);
    try {
      await apiClient.delete(`/invitations/${id}/`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Couldn't revoke — this invitation was already accepted or removed. Refreshing the list.");
      } else {
        setError("Couldn't revoke this invitation. Please try again.");
      }
    }
    loadInvitations();
  }

  function copyMessage(inv: Invitation) {
    const message = `You've been invited to Ordering System as ${inv.role}. Sign in with Google using ${inv.email} at ${inv.invite_link}`;
    navigator.clipboard.writeText(message);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-navy">Manage Users</h1>
        <button
          onClick={() => {
            setLoading(true);
            loadInvitations();
          }}
          className="text-sm text-navy-light hover:underline"
        >
          Refresh
        </button>
      </div>

      <form
        onSubmit={handleInvite}
        className="mt-4 flex flex-col gap-3 rounded border border-gray-200 p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="block text-sm text-gray-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            placeholder="name@company.com"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded bg-navy px-4 py-2 text-white hover:bg-navy-light">
          Invite
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2">Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100">
                  <td className="py-2">{inv.email}</td>
                  <td>{inv.role}</td>
                  <td className="capitalize">{inv.status}</td>
                  <td className="py-2 text-right">
                    {inv.status === "pending" && (
                      <div className="flex justify-end gap-3">
                        <button onClick={() => copyMessage(inv)} className="text-navy-light hover:underline">
                          {copiedId === inv.id ? "Copied!" : "Copy link"}
                        </button>
                        <button onClick={() => handleRevoke(inv.id)} className="text-red-600 hover:underline">
                          Revoke
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-400">
                    No invitations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
