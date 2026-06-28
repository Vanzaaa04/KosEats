"use client";

import { useState, useEffect } from "react";
import { Settings, Save, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function SellerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    gopayNumber: "",
    danaNumber: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchStore();
  }, []);

  const fetchStore = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/stores/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      
      if (result.success && result.data) {
        setFormData({
          name: result.data.name || "",
          description: result.data.description || "",
          address: result.data.address || "",
          gopayNumber: result.data.gopayNumber || "",
          danaNumber: result.data.danaNumber || ""
        });
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memuat profil toko");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (!formData.gopayNumber && !formData.danaNumber) {
      setError("Anda wajib mengisi minimal satu nomor e-Wallet (GoPay atau DANA).");
      setSaving(false);
      return;
    }
    
    if (formData.gopayNumber && !formData.gopayNumber.startsWith('08')) {
      setError("Nomor GoPay harus diawali dengan 08.");
      setSaving(false);
      return;
    }
    
    if (formData.danaNumber && !formData.danaNumber.startsWith('08')) {
      setError("Nomor DANA harus diawali dengan 08.");
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/stores/my`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      
      if (result.success) {
        setSuccess("Pengaturan berhasil disimpan.");
      } else {
        setError(result.message || "Gagal menyimpan pengaturan.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem" }}>Memuat pengaturan...</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Settings size={32} className="text-primary" /> Pengaturan Toko
      </h1>

      <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
        {error && (
          <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "1rem", borderRadius: "8px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={20} /> {error}
          </div>
        )}
        
        {success && (
          <div style={{ backgroundColor: "#dcfce7", color: "#15803d", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Nama Toko</label>
            <input 
              type="text" 
              name="name"
              className="input-field" 
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Alamat / Patokan Kos</label>
            <textarea 
              name="address"
              className="input-field" 
              value={formData.address}
              onChange={handleChange}
              rows={3}
              required
            />
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.5rem", marginTop: "1rem" }}>
            <h3 style={{ marginBottom: "1rem", color: "#f97316" }}>Metode Pembayaran (Wajib Isi Minimal Satu)</h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>Nomor e-Wallet ini akan ditampilkan kepada pembeli saat mereka memilih metode Transfer Manual.</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Nomor GoPay</label>
                <input 
                  type="text" 
                  name="gopayNumber"
                  placeholder="Contoh: 081234567890"
                  className="input-field" 
                  value={formData.gopayNumber}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Nomor DANA</label>
                <input 
                  type="text" 
                  name="danaNumber"
                  placeholder="Contoh: 081234567890"
                  className="input-field" 
                  value={formData.danaNumber}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
            <Save size={20} /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </form>
      </div>
    </div>
  );
}
