"use client";

import { useState, useEffect } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, AlertTriangle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

export default function CourierFinance() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/wallet`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setWallet(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}><p className="pulse">Memuat data dompet...</p></div>;
  }

  const balance = wallet?.balance || 0;
  const transactions = wallet?.transactions || [];
  const isMinus = balance < 0;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "4rem" }}>
      <div className="explore-header" style={{ marginBottom: "2rem" }}>
        <h1>Dompet & Komisi 💸</h1>
        <p className="text-muted">Kelola penghasilan dan kasbon COD Anda di sini.</p>
      </div>

      {/* Saldo Card */}
      <div className={`card ${isMinus ? 'card-danger' : 'card-primary'}`} style={{ marginBottom: "2rem", textAlign: "center", padding: "2rem", background: isMinus ? 'var(--color-danger-light)' : 'var(--color-primary-light)', color: isMinus ? 'var(--color-danger)' : 'var(--color-primary)', border: `2px solid ${isMinus ? 'var(--color-danger)' : 'var(--color-primary)'}` }}>
        <Wallet size={48} style={{ margin: "0 auto 1rem auto" }} />
        <p style={{ fontWeight: "bold", fontSize: "1.1rem" }}>Saldo Saat Ini</p>
        <h1 style={{ fontSize: "3rem", margin: "0.5rem 0" }}>{formatPrice(balance)}</h1>
        {isMinus && (
          <p style={{ marginTop: "1rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <AlertTriangle size={20} /> Saldo Anda Minus (Kasbon)
          </p>
        )}
      </div>

      {/* Instruksi Kasbon */}
      <div className="card" style={{ marginBottom: "2rem", borderLeft: "4px solid var(--color-warning)" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <AlertTriangle size={20} color="var(--color-warning)" /> Informasi Kasbon / Setor Tunai
        </h3>
        <p style={{ marginBottom: "1rem", lineHeight: "1.6" }}>
          KosEats memberikan batas kasbon maksimal <strong>Rp -150.000</strong> agar Anda bisa mengambil pesanan COD tanpa saldo. Jika saldo Anda mencapai batas ini, Anda <strong>tidak bisa mengambil pesanan</strong> hingga kasbon dilunasi.
        </p>
        <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
          <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Cara Setor Tunai / Bayar Kasbon:</p>
          <ol style={{ paddingLeft: "1.5rem", lineHeight: "1.6", margin: 0 }}>
            <li>Transfer nominal yang ingin disetor ke Gopay Admin: <strong>0812-3456-7890 (A/n Bos KosEats)</strong></li>
            <li>Screenshot bukti transfer.</li>
            <li>Kirim foto tersebut ke WhatsApp Admin beserta ID Kurir Anda.</li>
            <li>Admin akan memproses Top-Up Manual ke akun Anda.</li>
          </ol>
        </div>
      </div>

      {/* Riwayat Transaksi */}
      <div className="card">
        <h3 style={{ marginBottom: "1.5rem" }}>Riwayat Transaksi</h3>
        {transactions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {transactions.map(tx => (
              <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {tx.amount < 0 ? (
                    <ArrowDownCircle size={32} color="var(--color-danger)" />
                  ) : (
                    <ArrowUpCircle size={32} color="var(--color-success)" />
                  )}
                  <div>
                    <p style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>{tx.description || tx.type}</p>
                    <p style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>{formatDate(tx.createdAt)}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: "bold", color: tx.amount < 0 ? "var(--color-danger)" : "var(--color-success)", fontSize: "1.1rem" }}>
                    {tx.amount > 0 ? "+" : ""}{formatPrice(tx.amount)}
                  </p>
                  <span className={`badge badge-${tx.status === 'PAID' ? 'success' : 'warning'}`} style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center" style={{ padding: "2rem" }}>
            <p className="text-muted">Belum ada riwayat transaksi dompet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
