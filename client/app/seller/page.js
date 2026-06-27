"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, Wallet, TrendingUp, Star } from "lucide-react";

const API_URL = "http://localhost:5000/api";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default function SellerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

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

      <div className="grid grid-2">
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
    </div>
  );
}
