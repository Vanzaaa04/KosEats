"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatMonth(monthStr) {
  const [year, month] = monthStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export default function SellerFinancePage() {
  const [finance, setFinance] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinance();
  }, []);

  const fetchFinance = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/menus/seller/finance`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFinance(data.data);
      }

      const resWallet = await fetch(`${API_URL}/wallet`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const dataWallet = await resWallet.json();
      if (dataWallet.success) {
        setWallet(dataWallet.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem" }}><p>Memuat data keuangan...</p></div>;
  }

  const data = finance || {
    totalGross: 0, totalCommission: 0, totalNet: 0,
    totalOrders: 0, recentOrders: [], monthlyBreakdown: []
  };

  return (
    <div>
      <div className="explore-header">
        <h1>Saldo & Komisi 💰</h1>
        <p className="text-muted">Ringkasan pendapatan dan potongan komisi platform KosEats.</p>
      </div>

      {/* Saldo Aktual Dompet */}
      {wallet && (
        <div className={`card ${wallet.balance < 0 ? 'card-danger' : 'card-primary'}`} style={{ marginBottom: "2rem", textAlign: "center", padding: "2rem", background: wallet.balance < 0 ? 'var(--color-danger-light)' : 'var(--color-primary-light)', color: wallet.balance < 0 ? 'var(--color-danger)' : 'var(--color-primary)', border: `2px solid ${wallet.balance < 0 ? 'var(--color-danger)' : 'var(--color-primary)'}` }}>
          <p style={{ fontWeight: "bold", fontSize: "1.1rem" }}>Saldo Dompet Aktual</p>
          <h1 style={{ fontSize: "3rem", margin: "0.5rem 0" }}>{formatPrice(wallet.balance)}</h1>
          
          {wallet.balance < 0 && (
            <div style={{ marginTop: "1.5rem", background: "#fff", color: "var(--color-text)", padding: "1rem", borderRadius: "8px", textAlign: "left", border: "1px solid var(--color-danger)" }}>
              <p style={{ fontWeight: "bold", color: "var(--color-danger)", marginBottom: "0.5rem" }}>⚠️ Anda Memiliki Tunggakan Komisi (Kasbon)</p>
              <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                Batas maksimal tunggakan Anda adalah <strong>Rp -150.000</strong>. Jika melampaui, Anda tidak bisa memproses pesanan COD Seller Delivery.
              </p>
              <p style={{ fontSize: "0.9rem", fontWeight: "bold" }}>Cara Melunasi:</p>
              <ol style={{ fontSize: "0.9rem", paddingLeft: "1.2rem", margin: 0 }}>
                <li>Transfer ke Gopay Admin: <strong>0812-3456-7890 (Bos KosEats)</strong></li>
                <li>Hubungi WhatsApp Admin beserta ID Anda untuk melakukan Top-Up Manual.</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Ringkasan */}
      <div className="grid grid-3" style={{ marginBottom: "2rem" }}>
        <div className="stat-card primary">
          <div className="stat-icon">💵</div>
          <div className="stat-value">{formatPrice(data.totalNet)}</div>
          <div className="stat-label">Total Pendapatan Bersih</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{formatPrice(data.totalGross)}</div>
          <div className="stat-label">Total Penjualan (Bruto)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏦</div>
          <div className="stat-value" style={{ color: "var(--color-danger)" }}>{formatPrice(data.totalCommission)}</div>
          <div className="stat-label">Total Komisi Platform</div>
        </div>
      </div>

      {/* Breakdown Bulanan */}
      {data.monthlyBreakdown.length > 0 && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h4 style={{ marginBottom: "1rem" }}>📅 Breakdown Bulanan</h4>
          <div style={{ overflowX: "auto" }}>
            <table className="table-premium">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>Bulan</th>
                  <th style={{ padding: "0.75rem" }}>Orders</th>
                  <th style={{ padding: "0.75rem" }}>Bruto</th>
                  <th style={{ padding: "0.75rem" }}>Komisi</th>
                  <th style={{ padding: "0.75rem" }}>Bersih</th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyBreakdown.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.75rem", fontWeight: "600" }}>{formatMonth(row.month)}</td>
                    <td style={{ padding: "0.75rem" }}>{row.orders}</td>
                    <td style={{ padding: "0.75rem" }}>{formatPrice(row.gross)}</td>
                    <td style={{ padding: "0.75rem", color: "var(--color-danger)" }}>-{formatPrice(row.commission)}</td>
                    <td style={{ padding: "0.75rem", fontWeight: "bold", color: "var(--color-success)" }}>{formatPrice(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Riwayat Transaksi Terbaru */}
      <div className="card">
        <h4 style={{ marginBottom: "1rem" }}>🧾 Riwayat Transaksi Terbaru</h4>
        {data.recentOrders.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table-premium">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>ID</th>
                  <th style={{ padding: "0.75rem" }}>Pembeli</th>
                  <th style={{ padding: "0.75rem" }}>Total</th>
                  <th style={{ padding: "0.75rem" }}>Komisi</th>
                  <th style={{ padding: "0.75rem" }}>Bersih</th>
                  <th style={{ padding: "0.75rem" }}>Status</th>
                  <th style={{ padding: "0.75rem" }}>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.75rem" }}>#{order.id}</td>
                    <td style={{ padding: "0.75rem" }}>{order.buyer?.name || "-"}</td>
                    <td style={{ padding: "0.75rem" }}>{formatPrice(order.total)}</td>
                    <td style={{ padding: "0.75rem", color: "var(--color-danger)" }}>-{formatPrice(order.platformFee)}</td>
                    <td style={{ padding: "0.75rem", fontWeight: "bold" }}>{formatPrice(order.total - order.platformFee)}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span className={`badge badge-${order.status === "DELIVERED" ? "success" : "warning"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "var(--font-size-sm)" }}>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center" style={{ padding: "2rem" }}>
            <p style={{ fontSize: "3rem" }}>📭</p>
            <p className="text-muted">Belum ada transaksi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
