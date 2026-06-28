"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, Wallet, TrendingUp, Star } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default function SellerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState({ balance: 0, transactions: [] });
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState(50000);

  useEffect(() => {
    fetchDashboard();
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_URL}/wallet`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setWalletData(result.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/wallet/topup`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: topupAmount })
      });
      const result = await res.json();
      if (result.success) {
        window.location.href = result.data.invoiceUrl;
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/menus/seller/dashboard`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem" }}><p>Memuat dashboard...</p></div>;
  }

  const dashboard = data || {
    totalRevenue: 0, completedOrders: 0, avgRating: 0,
    todayOrders: 0, pendingOrders: 0, topMenus: []
  };

  return (
    <div>
      <h1 style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><LayoutDashboard size={32} className="text-primary" /> Dashboard Penjual</h1>
      
      <div className="grid grid-3" style={{ marginBottom: "2rem" }}>
        <div className="stat-card primary">
          <div className="stat-icon"><Wallet size={40} /></div>
          <div className="stat-value">{formatPrice(dashboard.totalRevenue)}</div>
          <div className="stat-label">Pendapatan Bulan Ini (Bersih)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={40} className="text-primary" /></div>
          <div className="stat-value">{dashboard.completedOrders}</div>
          <div className="stat-label">Pesanan Selesai</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Star size={40} className="text-warning" /></div>
          <div className="stat-value text-warning">{dashboard.avgRating || "-"}</div>
          <div className="stat-label">Rating Rata-rata ({dashboard.totalReviews || 0} review)</div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: "2rem" }}>
        <div className="card" style={{ background: "linear-gradient(135deg, var(--color-primary), #6b21a8)", color: "white" }}>
          <h4 style={{ color: "white", marginBottom: "0.5rem", opacity: 0.9 }}>Saldo Dompet (COD)</h4>
          <div style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>{formatPrice(walletData.balance)}</div>
          <button className="btn btn-outline btn-sm" style={{ borderColor: "white", color: "white" }} onClick={() => setShowTopup(true)}>Top-Up Saldo</button>
        </div>
        <div className="card">
          <h4 style={{ marginBottom: "1rem" }}>Pesanan Hari Ini</h4>
          <p className="text-muted">
            {dashboard.pendingOrders > 0
              ? `Ada ${dashboard.pendingOrders} pesanan yang harus disiapkan.`
              : dashboard.todayOrders > 0
                ? `${dashboard.todayOrders} pesanan masuk hari ini.`
                : "Belum ada pesanan hari ini."}
          </p>
          <Link href="/seller/orders" className="btn btn-primary" style={{ marginTop: "1rem" }}>Lihat Pesanan Masuk</Link>
        </div>
        <div className="card">
          <h4 style={{ marginBottom: "1rem" }}>Menu Terlaris</h4>
          {dashboard.topMenus.length > 0 ? (
            <ol style={{ paddingLeft: "1.5rem" }}>
              {dashboard.topMenus.map((menu, idx) => (
                <li key={idx} style={{ marginBottom: "0.5rem" }}>
                  {menu.name} ({menu.totalSold} porsi)
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted">Belum ada data penjualan.</p>
          )}
        </div>
      </div>

      {/* Modal Top Up */}
      {showTopup && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
            <div className="flex-between" style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ color: "var(--color-primary)" }}>Top-Up Saldo KosEats</h3>
              <button onClick={() => setShowTopup(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: "1.5rem" }}>Saldo digunakan sebagai jaminan untuk menerima pesanan COD (potongan komisi 12%).</p>
            <form onSubmit={handleTopup}>
              <div className="form-group">
                <label className="form-label">Pilih Nominal</label>
                <select className="form-input" value={topupAmount} onChange={e => setTopupAmount(parseInt(e.target.value))}>
                  <option value={10000}>Rp 10.000</option>
                  <option value={50000}>Rp 50.000</option>
                  <option value={100000}>Rp 100.000</option>
                  <option value={200000}>Rp 200.000</option>
                  <option value={500000}>Rp 500.000</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }}>Lanjutkan Pembayaran</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
