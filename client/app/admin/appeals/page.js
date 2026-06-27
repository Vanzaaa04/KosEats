"use client";

import { useState } from "react";

export default function AdminAppealsPage() {
  const [appeals, setAppeals] = useState([
    {
      id: 1,
      orderId: "KE-12345",
      buyerName: "Irgi Ahmad",
      storeName: "Dapur Bu Tini",
      reason: "Makanan basi / rusak",
      description: "Ayam gepreknya berbau asam dan tidak bisa dimakan.",
      status: "ESCALATED",
      date: "2026-06-25",
      total: 15000
    }
  ]);

  const resolveAppeal = (id, approveRefund) => {
    // Dummy response UI interaction
    setAppeals(appeals.map(a => {
      if (a.id === id) {
        return { ...a, status: approveRefund ? "REFUNDED_BY_ADMIN" : "REJECTED_BY_ADMIN" };
      }
      return a;
    }));
  };

  return (
    <div>
      <div className="explore-header">
        <h1 className="text-error">Sengketa (Banding) ⚖️</h1>
        <p className="text-muted">Tinjau sengketa yang ditolak oleh penjual (Escalated) dan ambil keputusan yang adil.</p>
      </div>

      <div className="grid gap-6">
        {appeals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <p className="empty-state-text">Tidak ada sengketa yang perlu ditinjau admin.</p>
          </div>
        ) : appeals.map(appeal => (
          <div className="card" key={appeal.id} style={{ borderLeft: appeal.status === 'ESCALATED' ? "4px solid var(--color-error)" : "4px solid var(--color-border)" }}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <div>
                <h4 style={{ marginBottom: "0.25rem" }}>Order #{appeal.orderId}</h4>
                <p className="text-xs text-muted">Pembeli: <strong>{appeal.buyerName}</strong> | Penjual: <strong>{appeal.storeName}</strong></p>
              </div>
              <div className="text-right">
                <span className={`badge ${appeal.status === 'ESCALATED' ? 'badge-error' : 'badge-secondary'}`}>
                  {appeal.status}
                </span>
              </div>
            </div>

            <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
              <div className="text-error" style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Alasan: {appeal.reason}</div>
              <p className="text-sm">"{appeal.description}"</p>
            </div>

            {appeal.status === "ESCALATED" && (
              <div style={{ background: "var(--color-error-light)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
                <p className="text-sm" style={{ marginBottom: "1rem" }}><strong>Aksi Admin:</strong> Sengketa ini membutuhkan keputusan final. Apakah klaim pembeli terbukti?</p>
                <div className="flex gap-4">
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => resolveAppeal(appeal.id, true)}>Klaim Terbukti (Refund Pembeli)</button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => resolveAppeal(appeal.id, false)}>Klaim Ditolak (Teruskan Dana ke Penjual)</button>
                </div>
              </div>
            )}
            
            {appeal.status === "REFUNDED_BY_ADMIN" && (
              <p className="text-sm text-success">Keputusan Admin: Refund. Dana dikembalikan ke pembeli.</p>
            )}
            {appeal.status === "REJECTED_BY_ADMIN" && (
              <p className="text-sm text-error">Keputusan Admin: Tolak Klaim. Dana diteruskan ke penjual.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
