"use client";

import { useState, useEffect } from "react";
import { Bike, CheckCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCouriers();
  }, []);

  const fetchCouriers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/admin/couriers`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCouriers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateCourierStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      const approve = status === "APPROVED";
      
      const res = await fetch(`${API_URL}/admin/couriers/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ approve })
      });
      const data = await res.json();
      
      if (data.success) {
        fetchCouriers(); // Refresh
        alert(data.message);
      } else {
        alert(data.message || "Gagal mengubah status kurir.");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  return (
    <div>
      <div className="explore-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Bike size={32} className="text-primary" /> Approval Kurir</h1>
          <p className="text-muted">Tinjau dan setujui pendaftaran mitra driver (kurir).</p>
        </div>
        <div style={{ background: "var(--color-bg)", padding: "1rem 2rem", borderRadius: "12px", border: "1px solid var(--color-border)", textAlign: "center" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Total Driver (Menunggu/Disetujui)</span>
          <h2 style={{ margin: "0.25rem 0 0 0", color: "var(--color-primary)" }}>{couriers.length}</h2>
        </div>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <p>Memuat data kurir...</p>
        ) : couriers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: "var(--color-success)" }}><CheckCircle size={48} /></div>
            <p className="empty-state-text">Tidak ada pengajuan kurir yang perlu ditinjau.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table-premium">
              <thead style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                <tr>
                  <th style={{ padding: "1rem" }}>Nama Driver</th>
                  <th style={{ padding: "1rem" }}>Kontak</th>
                  <th style={{ padding: "1rem" }}>Detail Kendaraan</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map(courier => (
                  <tr key={courier.id} className="hover-bg-subtle" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "1rem", fontWeight: "bold" }}>{courier.user?.name || "N/A"}</td>
                    <td style={{ padding: "1rem" }}>
                      {courier.user?.phone || "-"}<br/>
                      <span className="text-muted text-xs">{courier.user?.email}</span>
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      <strong>Plat: {courier.vehiclePlate}</strong><br/>
                      <span className="text-muted text-xs">{courier.vehicleBrand} - {courier.vehicleColor}</span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span className={`badge ${courier.status === 'APPROVED' ? 'badge-success' : courier.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                        {courier.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {courier.ktpUrl && (
                        <a href={`${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}${courier.ktpUrl}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                          Lihat KTP
                        </a>
                      )}
                      {courier.status === "PENDING" && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => updateCourierStatus(courier.id, "APPROVED")}>Setujui</button>
                          <button className="btn btn-danger btn-sm" onClick={() => updateCourierStatus(courier.id, "REJECTED")}>Tolak</button>
                        </>
                      )}
                      {courier.status === "APPROVED" && (
                        <button className="btn btn-secondary btn-sm" onClick={() => updateCourierStatus(courier.id, "SUSPENDED")}>Suspend</button>
                      )}
                      {courier.status === "SUSPENDED" && (
                        <button className="btn btn-success btn-sm" onClick={() => updateCourierStatus(courier.id, "APPROVED")}>Aktifkan</button>
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
