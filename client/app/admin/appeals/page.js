"use client";

import { useState, useEffect } from "react";
import { Scale, CheckCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

export default function AdminAppealsPage() {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppeals();
  }, []);

  const fetchAppeals = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/admin/appeals`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAppeals(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resolveAppeal = async (id, approveRefund) => {
    if (!confirm(approveRefund ? "Yakin ingin setujui klaim dan proses refund?" : "Yakin ingin tolak klaim pembeli?")) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/appeals/${id}/admin-decide`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ approve: approveRefund })
      });
      const data = await res.json();
      
      if (data.success) {
        alert("Keputusan berhasil disimpan!");
        fetchAppeals(); // Refresh
      } else {
        alert(data.message || "Gagal menyimpan keputusan.");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  return (
    <div>
      <div className="explore-header">
        <h1 className="text-error" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Scale size={32} /> Sengketa (Banding)</h1>
        <p className="text-muted">Tinjau sengketa yang ditolak oleh penjual (Escalated) dan ambil keputusan yang adil.</p>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <p>Memuat data sengketa...</p>
        ) : appeals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: "var(--color-success)" }}><CheckCircle size={48} /></div>
            <p className="empty-state-text">Tidak ada sengketa yang perlu ditinjau admin saat ini.</p>
          </div>
        ) : appeals.map(appeal => (
          <div className="card hover-scale" key={appeal.id} style={{ borderLeft: appeal.status === 'WAITING_ADMIN' ? "4px solid var(--color-error)" : "4px solid var(--color-border)" }}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <div>
                <h4 style={{ marginBottom: "0.25rem" }}>Order #{appeal.orderId}</h4>
                <p className="text-xs text-muted">
                  Pembeli: <strong>{appeal.buyer?.name || "N/A"}</strong> | Penjual: <strong>{appeal.order?.store?.name || "N/A"}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className={`badge ${appeal.status === 'WAITING_ADMIN' ? 'badge-error' : 'badge-secondary'}`}>
                  {appeal.status.replace("_", " ")}
                </span>
              </div>
            </div>

            <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
              <div className="text-error" style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Alasan: {appeal.reason}</div>
              <p className="text-sm">"{appeal.description}"</p>
              {appeal.photos && appeal.photos.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  {appeal.photos.map((photo, idx) => (
                    <img key={idx} src={photo} alt="Bukti" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                  ))}
                </div>
              )}
            </div>

            {appeal.status === "WAITING_ADMIN" && (
              <div style={{ background: "var(--color-error-light)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
                <p className="text-sm" style={{ marginBottom: "1rem" }}><strong>Aksi Admin:</strong> Sengketa ini membutuhkan keputusan final. Apakah klaim pembeli terbukti?</p>
                <div className="flex gap-4">
                  <button className="btn btn-success hover-scale" style={{ flex: 1 }} onClick={() => resolveAppeal(appeal.id, true)}>Klaim Terbukti (Refund Pembeli)</button>
                  <button className="btn btn-danger hover-scale" style={{ flex: 1 }} onClick={() => resolveAppeal(appeal.id, false)}>Klaim Ditolak (Teruskan Dana ke Penjual)</button>
                </div>
              </div>
            )}
            
            {appeal.status === "ADMIN_APPROVED" && (
              <p className="text-sm text-success">Keputusan Admin: Refund. Dana dikembalikan ke pembeli.</p>
            )}
            {appeal.status === "ADMIN_REJECTED" && (
              <p className="text-sm text-error">Keputusan Admin: Tolak Klaim. Dana diteruskan ke penjual.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
