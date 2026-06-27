"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default function AdminDashboard() {
  return (
    <div>
      <div className="explore-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1>Dashboard Analitik 📈</h1>
          <p className="text-muted">Pantau performa platform KosEats secara real-time.</p>
        </div>
        <div>
          <button className="btn btn-secondary">Download Laporan (.csv)</button>
        </div>
      </div>

      {/* 6 Grafik Analitik Admin (Sesuai Blueprint) */}
      <div className="grid grid-3" style={{ marginBottom: "2rem" }}>
        <div className="stat-card primary">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{formatPrice(4500000)}</div>
          <div className="stat-label">1. Total Pendapatan Komisi (12%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-value">1,245</div>
          <div className="stat-label">2. Volume Transaksi Bulan Ini</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">850</div>
          <div className="stat-label">3. Pertumbuhan User Baru</div>
        </div>
      </div>

      <div className="grid grid-3" style={{ marginBottom: "2rem" }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
          <div className="stat-icon">⏰</div>
          <h4 style={{ marginTop: "1rem" }}>4. Jam Peak Order</h4>
          <p className="text-muted text-center" style={{ marginTop: "0.5rem" }}>Tersibuk: <strong>11:30 - 13:00</strong><br/>(Waktu Makan Siang)</p>
        </div>
        
        <div className="card">
          <h4 style={{ marginBottom: "1rem" }}>5. Top 5 Menu Terlaris</h4>
          <ol style={{ paddingLeft: "1.5rem", fontSize: "var(--font-size-sm)" }}>
            <li style={{ marginBottom: "0.5rem" }}>Nasi Ayam Geprek (120 porsi)</li>
            <li style={{ marginBottom: "0.5rem" }}>Nasi Rendang (95 porsi)</li>
            <li style={{ marginBottom: "0.5rem" }}>Es Teh Manis (200 gelas)</li>
            <li style={{ marginBottom: "0.5rem" }}>Nasi Pecel (80 porsi)</li>
            <li>Sayur Asem (65 porsi)</li>
          </ol>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
          <div className="stat-icon">⭐</div>
          <h4 style={{ marginTop: "1rem" }}>6. Distribusi Rating</h4>
          <p className="text-muted text-center" style={{ marginTop: "0.5rem" }}>
            ⭐ 5: 85%<br/>
            ⭐ 4: 10%<br/>
            Lainnya: 5%
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h4>Approval Toko (Menunggu)</h4>
            <Link href="/admin/stores" className="text-sm">Lihat Semua</Link>
          </div>
          <div style={{ padding: "1rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", marginBottom: "0.5rem" }}>
            <div className="flex-between">
              <div>
                <strong>Warung Pak Budi</strong>
                <p className="text-xs text-muted">Mendaftar 2 jam lalu</p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-outline btn-sm">Tinjau</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: "4px solid var(--color-error)" }}>
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <h4 className="text-error">Banding / Sengketa (Escalated)</h4>
            <Link href="/admin/appeals" className="text-sm">Lihat Semua</Link>
          </div>
          <div style={{ padding: "1rem", background: "var(--color-error-light)", borderRadius: "var(--radius-md)" }}>
            <div className="flex-between">
              <div>
                <strong>Order #KE-12345</strong>
                <p className="text-xs text-error">Penjual menolak refund dari pembeli.</p>
              </div>
              <button className="btn btn-danger btn-sm">Jadi Hakim</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
