"use client";

import { useState, useEffect } from "react";

const API_URL = "http://localhost:5000/api";

export default function AdminStoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/admin/sellers`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStores(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStoreStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      const approve = status === "APPROVED";
      
      const res = await fetch(`${API_URL}/admin/sellers/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ approve })
      });
      const data = await res.json();
      
      if (data.success) {
        fetchStores(); // Refresh
        alert(data.message);
      } else {
        alert(data.message || "Gagal mengubah status toko.");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  return (
    <div>
      <div className="explore-header">
        <h1>Approval Toko 🏪</h1>
        <p className="text-muted">Tinjau dan setujui pendaftaran warung baru.</p>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <p>Memuat data toko...</p>
        ) : stores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <p className="empty-state-text">Tidak ada toko yang terdaftar.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table-premium">
              <thead style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                <tr>
                  <th style={{ padding: "1rem" }}>Nama Warung</th>
                  <th style={{ padding: "1rem" }}>Pemilik</th>
                  <th style={{ padding: "1rem" }}>Lokasi (Lat, Lng)</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "1rem", fontWeight: "bold" }}>{store.name}</td>
                    <td style={{ padding: "1rem" }}>{store.user?.name || "N/A"}</td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{store.latitude}, {store.longitude}</td>
                    <td style={{ padding: "1rem" }}>
                      <span className={`badge ${store.status === 'APPROVED' ? 'badge-success' : store.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                        {store.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", display: "flex", gap: "0.5rem" }}>
                      {store.status === "PENDING" && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => updateStoreStatus(store.id, "APPROVED")}>Setujui</button>
                          <button className="btn btn-danger btn-sm" onClick={() => updateStoreStatus(store.id, "REJECTED")}>Tolak</button>
                        </>
                      )}
                      {store.status === "APPROVED" && (
                        <button className="btn btn-secondary btn-sm" onClick={() => updateStoreStatus(store.id, "SUSPENDED")}>Suspend</button>
                      )}
                      {store.status === "SUSPENDED" && (
                        <button className="btn btn-success btn-sm" onClick={() => updateStoreStatus(store.id, "APPROVED")}>Aktifkan</button>
                      )}
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
