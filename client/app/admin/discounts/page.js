"use client";

import { useState, useEffect } from "react";
import { Gift, Frown, Plus } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    type: "DELIVERY", // or FOOD
    amount: "",
    quotaTotal: "",
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/discounts/platform`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDiscounts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiscount = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/discounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          type: formData.type,
          amount: parseInt(formData.amount),
          quotaTotal: parseInt(formData.quotaTotal)
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setShowModal(false);
        fetchDiscounts(); // Refresh
        setFormData({ type: "DELIVERY", amount: "", quotaTotal: "" });
        alert("Diskon platform berhasil ditambahkan!");
      } else {
        alert(data.message || "Gagal menambah diskon.");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  const toggleDiscount = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/discounts/${id}/toggle`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchDiscounts(); // Refresh
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  function formatPrice(price) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
  }

  return (
    <div>
      <div className="explore-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Gift size={32} className="text-primary" /> Diskon Platform</h1>
          <p className="text-muted">Kelola promo ongkir dan diskon subsidi dari KosEats.</p>
        </div>
        <button className="btn btn-primary hover-scale" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={() => setShowModal(true)}><Plus size={20} /> Tambah Diskon</button>
      </div>

      <div className="grid gap-6" style={{ marginTop: "2rem" }}>
        {loading ? (
          <p>Memuat diskon...</p>
        ) : discounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ color: "var(--color-muted)" }}><Frown size={48} /></div>
            <p className="empty-state-text">Belum ada promo aktif.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table-premium">
              <thead style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}>
                <tr>
                  <th style={{ padding: "1rem" }}>Tipe</th>
                  <th style={{ padding: "1rem" }}>Potongan</th>
                  <th style={{ padding: "1rem" }}>Kuota Terpakai</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map(discount => (
                  <tr key={discount.id} className="hover-bg-subtle" style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "1rem", fontWeight: "bold" }}>
                      {discount.type === 'DELIVERY' ? 'Gratis Ongkir' : 'Diskon Makanan'}
                    </td>
                    <td style={{ padding: "1rem", color: "var(--color-error)", fontWeight: "bold" }}>
                      -{formatPrice(discount.amount)}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {discount.quotaUsed} / {discount.quotaTotal}
                      <div style={{ width: "100%", height: "4px", background: "var(--color-border)", marginTop: "4px", borderRadius: "2px" }}>
                        <div style={{ width: `${Math.min((discount.quotaUsed / discount.quotaTotal) * 100, 100)}%`, height: "100%", background: "var(--color-primary)", borderRadius: "2px" }} />
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span className={`badge ${discount.isActive ? 'badge-success' : 'badge-error'}`}>
                        {discount.isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <button 
                        className={`btn btn-sm ${discount.isActive ? 'btn-danger' : 'btn-success'}`}
                        onClick={() => toggleDiscount(discount.id)}
                      >
                        {discount.isActive ? 'Matikan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Diskon */}
      {showModal && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card fade-in" style={{ width: "100%", maxWidth: "500px" }}>
            <h3 style={{ marginBottom: "1.5rem" }}>Buat Promo Platform Baru</h3>
            <form onSubmit={handleAddDiscount}>
              <div className="form-group">
                <label className="form-label">Tipe Promo</label>
                <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="DELIVERY">Gratis Ongkir / Potongan Ongkir</option>
                  <option value="FOOD">Potongan Harga Makanan</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Jumlah Potongan (Rp)</label>
                <input type="number" className="form-input" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="Contoh: 5000" />
              </div>

              <div className="form-group">
                <label className="form-label">Total Kuota Pengguna</label>
                <input type="number" className="form-input" required value={formData.quotaTotal} onChange={e => setFormData({...formData, quotaTotal: e.target.value})} placeholder="Contoh: 100" />
              </div>

              <div className="flex gap-4" style={{ marginTop: "2rem" }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Buat Promo</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
