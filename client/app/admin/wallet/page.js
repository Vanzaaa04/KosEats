"use client";

import { useState } from "react";
import { Search, PlusCircle, CheckCircle, AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

export default function AdminWalletPage() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("");

  const handleTopUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/wallet/manual-topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          amount: parseFloat(amount)
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessageType("success");
        setMessage(data.message);
        setUserId("");
        setAmount("");
      } else {
        setMessageType("error");
        setMessage(data.message || "Gagal melakukan Top-Up.");
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Terjadi kesalahan sistem saat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="explore-header">
        <h1>Suntik Saldo Manual (Top-Up) 💸</h1>
        <p className="text-muted">Gunakan halaman ini HANYA jika Anda sudah menerima transferan tunai (Gopay/BCA) dari Kurir atau Penjual yang ingin melunasi kasbon/tunggakan mereka.</p>
      </div>

      <div className="card" style={{ maxWidth: "600px", margin: "2rem auto" }}>
        <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <PlusCircle size={24} color="var(--color-primary)" /> Formulir Top-Up Saldo
        </h3>

        {message && (
          <div style={{
            padding: "1rem",
            marginBottom: "1.5rem",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: messageType === "success" ? "var(--color-success-light)" : "var(--color-danger-light)",
            color: messageType === "success" ? "var(--color-success)" : "var(--color-danger)",
            border: `1px solid ${messageType === "success" ? "var(--color-success)" : "var(--color-danger)"}`
          }}>
            {messageType === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span style={{ fontWeight: "bold" }}>{message}</span>
          </div>
        )}

        <form onSubmit={handleTopUp} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="form-group">
            <label style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>ID Pengguna (User ID)</label>
            <div style={{ position: "relative" }}>
              <Search size={20} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Contoh: 5"
                required
                className="input-premium"
                style={{ paddingLeft: "40px", width: "100%" }}
              />
            </div>
            <small className="text-muted" style={{ display: "block", marginTop: "0.25rem" }}>Pastikan ID Pengguna benar (bisa ditanyakan langsung ke Kurir/Penjual).</small>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>Nominal Uang (Rp)</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontWeight: "bold", color: "var(--color-muted)" }}>Rp</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
                required
                min="100"
                className="input-premium"
                style={{ paddingLeft: "40px", width: "100%" }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ padding: "1rem", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            {loading ? "Memproses..." : "Suntik Saldo Sekarang"}
          </button>
        </form>
      </div>
    </div>
  );
}
