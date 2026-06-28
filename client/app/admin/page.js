"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DollarSign, Package, Users, Clock, Star, Store, ShieldAlert, BarChart3, Download } from "lucide-react";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    totalUsers: 0,
    pendingSellers: 0,
    avgRating: 0,
    totalReviews: 0,
    pendingAppeals: 0
  });
  const [topMenus, setTopMenus] = useState([]);
  const [peakHour, setPeakHour] = useState("Belum ada data");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;
        
        const resStats = await fetch(`${API_URL}/admin/dashboard`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (resStats.ok) {
          const json = await resStats.json();
          if (json.success) setStats(json.data);
        }

        const resMenus = await fetch(`${API_URL}/admin/analytics/top-menus`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (resMenus.ok) {
          const json = await resMenus.json();
          if (json.success) setTopMenus(json.data);
        }

        const resPeak = await fetch(`${API_URL}/admin/analytics/peak-hours`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (resPeak.ok) {
          const json = await resPeak.json();
          if (json.success && json.data.length > 0) {
            let maxCount = 0;
            let peak = "Belum ada data";
            json.data.forEach(item => {
              if (item.count > maxCount) {
                maxCount = item.count;
                const hourInt = parseInt(item.hour.split(':')[0]);
                const nextHour = (hourInt + 1).toString().padStart(2, '0');
                peak = `${item.hour} - ${nextHour}:00`;
              }
            });
            setPeakHour(peak);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Memuat dashboard...</div>;
  }

  const handleDownloadExcel = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;
      
      const res = await fetch(`${API_URL}/admin/export/excel`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Gagal mengunduh file");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan_Eksekutif_KosEats_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengunduh laporan.");
    }
  };

  return (
    <div>
      <div className="explore-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><BarChart3 size={32} className="text-primary" /> Dashboard Analitik</h1>
          <p className="text-muted">Pantau performa platform KosEats secara real-time.</p>
        </div>
        <div>
          <button className="btn btn-secondary hover-scale" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={handleDownloadExcel}>
            <Download size={18} /> Download Laporan Profesional (.xlsx)
          </button>
        </div>
      </div>

      {/* 6 Grafik Analitik Admin (Sesuai Blueprint) */}
      <div className="grid grid-3" style={{ marginBottom: "2rem" }}>
        <div className="stat-card primary hover-scale">
          <div className="stat-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}><DollarSign size={32} /></div>
          <div className="stat-value text-center" style={{ fontSize: "1.75rem" }}>{formatPrice(stats.totalRevenue)}</div>
          <div className="stat-label text-center">1. Total Pendapatan Komisi (12%)</div>
        </div>
        <div className="stat-card hover-scale">
          <div className="stat-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem", color: "var(--color-primary)" }}><Package size={32} /></div>
          <div className="stat-value text-center" style={{ fontSize: "1.75rem" }}>{stats.totalTransactions}</div>
          <div className="stat-label text-center">2. Volume Transaksi Bulan Ini</div>
        </div>
        <div className="stat-card hover-scale">
          <div className="stat-icon" style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem", color: "var(--color-primary)" }}><Users size={32} /></div>
          <div className="stat-value text-center" style={{ fontSize: "1.75rem" }}>{stats.totalUsers}</div>
          <div className="stat-label text-center">3. Pertumbuhan User Baru</div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: "2rem" }}>
        <div className="card hover-scale" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
          <div className="stat-icon" style={{ color: "var(--color-primary)" }}><Clock size={36} /></div>
          <h4 style={{ marginTop: "1rem" }}>4. Jam Peak Order</h4>
          <p className="text-muted text-center" style={{ marginTop: "0.5rem" }}>Tersibuk: <br/><strong style={{ fontSize: "1.25rem", color: "var(--color-text)", display: "block", marginTop: "0.5rem" }}>{peakHour}</strong></p>
        </div>
        
        <div className="card hover-scale">
          <h4 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Star size={20} className="text-warning" /> Top 5 Menu Terlaris</h4>
          {topMenus.length === 0 ? (
            <p className="text-muted text-sm text-center" style={{ marginTop: "2rem" }}>Belum ada data penjualan.</p>
          ) : (
            <ol style={{ paddingLeft: "1.5rem", fontSize: "var(--font-size-sm)" }}>
              {topMenus.map((menu, idx) => (
                <li key={idx} style={{ marginBottom: "0.75rem", borderBottom: "1px dashed var(--color-border)", paddingBottom: "0.5rem" }}>
                  <div className="flex-between">
                    <span>{menu.name}</span>
                    <strong>{menu.totalSold} porsi</strong>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="card hover-scale" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
          <div className="stat-icon" style={{ color: "var(--color-warning)" }}><Star size={36} fill="currentColor" /></div>
          <h4 style={{ marginTop: "1rem" }}>6. Distribusi Rating</h4>
          <p className="text-muted text-center" style={{ marginTop: "0.5rem" }}>
            Rata-rata Rating:<br/>
            <strong style={{ fontSize: "2rem", color: "var(--color-text)", display: "block", marginTop: "0.5rem" }}>{stats.avgRating > 0 ? stats.avgRating : "-"}</strong>
            (Dari {stats.totalReviews} ulasan)
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card hover-scale">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Store size={20} className="text-primary" /> Approval Toko (Menunggu)</h4>
            <Link href="/admin/stores" className="text-sm">Lihat Semua</Link>
          </div>
          {stats.pendingSellers > 0 ? (
            <div style={{ padding: "1rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", marginBottom: "0.5rem" }}>
              <div className="flex-between">
                <div>
                  <strong>{stats.pendingSellers} Toko Menunggu Approval</strong>
                  <p className="text-xs text-muted">Perlu ditinjau segera</p>
                </div>
                <div className="flex gap-2">
                  <Link href="/admin/stores" className="btn btn-outline btn-sm">Tinjau</Link>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm text-center" style={{ marginTop: "2rem" }}>Tidak ada toko yang menunggu approval.</p>
          )}
        </div>

        <div className="card hover-scale" style={{ borderLeft: "4px solid var(--color-error)" }}>
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h4 className="text-error" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><ShieldAlert size={20} /> Banding / Sengketa</h4>
            <Link href="/admin/appeals" className="text-sm text-error">Lihat Semua</Link>
          </div>
          {stats.pendingAppeals > 0 ? (
            <div style={{ padding: "1rem", background: "var(--color-error-light)", borderRadius: "var(--radius-md)" }}>
              <div className="flex-between">
                <div>
                  <strong>{stats.pendingAppeals} Banding Menunggu</strong>
                  <p className="text-xs text-error">Butuh intervensi admin.</p>
                </div>
                <Link href="/admin/appeals" className="btn btn-danger btn-sm">Jadi Hakim</Link>
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm text-center" style={{ marginTop: "2rem" }}>Tidak ada sengketa berjalan.</p>
          )}
        </div>
      </div>
    </div>
  );
}
