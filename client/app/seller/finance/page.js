"use client";

import { useState, useEffect } from "react";

const API_URL = "http://localhost:5000/api";

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
