"use client";

import { useState, useEffect } from "react";
import { Users, UserX } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

export default function AdminUsersPage() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/admin/buyers`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBuyers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/admin/users/${id}/toggle`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchBuyers(); // Refresh
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  return (
    <div>
      <div className="explore-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Users size={32} className="text-primary" /> Kelola Pengguna</h1>
          <p className="text-muted">Daftar semua pembeli yang terdaftar di KosEats.</p>
        </div>
        <div style={{ background: "var(--color-bg)", padding: "1rem 2rem", borderRadius: "12px", border: "1px solid var(--color-border)", textAlign: "center" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Total Pengguna Aktif</span>
          <h2 style={{ margin: "0.25rem 0 0 0", color: "var(--color-primary)" }}>{buyers.filter(b => b.isActive).length}</h2>
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <p>Memuat data pengguna...</p>
        ) : buyers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: "var(--color-muted)" }}><UserX size={48} /></div>
            <p className="empty-state-text">Belum ada pengguna yang terdaftar.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table-premium">
              <thead style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                <tr>
                  <th style={{ padding: "1rem" }}>Nama Pengguna</th>
                  <th style={{ padding: "1rem" }}>Peran</th>
                  <th style={{ padding: "1rem" }}>Email</th>
                  <th style={{ padding: "1rem" }}>Nomor HP</th>
                  <th style={{ padding: "1rem" }}>Total Order</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {buyers.map(buyer => (
                  <tr key={buyer.id} className="hover-bg-subtle" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "1rem", fontWeight: "bold" }}>{buyer.name}</td>
                    <td style={{ padding: "1rem" }}>
                      <span className={`badge ${buyer.role === 'SELLER' ? 'badge-primary' : buyer.role === 'COURIER' ? 'badge-warning' : 'badge-secondary'}`}>
                        {buyer.role}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>{buyer.email}</td>
                    <td style={{ padding: "1rem" }}>{buyer.phone || "-"}</td>
                    <td style={{ padding: "1rem" }}>{buyer._count?.orders || 0}</td>
                    <td style={{ padding: "1rem" }}>
                      <span className={`badge ${buyer.isActive ? 'badge-success' : 'badge-error'}`}>
                        {buyer.isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <button 
                        className={`btn btn-sm ${buyer.isActive ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleUser(buyer.id)}
                      >
                        {buyer.isActive ? 'Suspend' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
