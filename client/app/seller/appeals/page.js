"use client";

import { useState } from "react";

export default function SellerAppealsPage() {
  const [appeals, setAppeals] = useState([
    {
      id: 1,
      orderId: "KE-12345",
      buyerName: "Irgi Ahmad",
      reason: "Makanan basi / rusak",
      description: "Ayam gepreknya berbau asam dan tidak bisa dimakan.",
      status: "WAITING_SELLER",
      date: "2026-06-25",
      total: 15000
    }
  ]);

  const respondToAppeal = (id, accept) => {
    // Dummy response UI interaction
    setAppeals(appeals.map(a => {
      if (a.id === id) {
        return { ...a, status: accept ? "ACCEPTED" : "ESCALATED" };
      }
      return a;
    }));
  };

  return (
    <div>
      <div className="explore-header">
        <h1 className="text-error">Banding & Sengketa ⚖️</h1>
        <p className="text-muted">Kelola komplain dari pembeli. Anda punya waktu 1x24 jam untuk merespon.</p>
      </div>

      <div className="grid gap-6">
        {appeals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <p className="empty-state-text">Tidak ada sengketa pesanan.</p>
          </div>
        ) : appeals.map(appeal => (
          <div className="card" key={appeal.id} style={{ borderLeft: appeal.status === 'WAITING_SELLER' ? "4px solid var(--color-warning)" : "4px solid var(--color-border)" }}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <div>
                <h4 style={{ marginBottom: "0.25rem" }}>Order #{appeal.orderId}</h4>
                <p className="text-xs text-muted">Dari: <strong>{appeal.buyerName}</strong> • {appeal.date}</p>
              </div>
              <div className="text-right">
                <span className={`badge ${appeal.status === 'WAITING_SELLER' ? 'badge-warning' : appeal.status === 'ACCEPTED' ? 'badge-success' : 'badge-error'}`}>
                  {appeal.status}
                </span>
                <p className="text-primary" style={{ fontWeight: "bold", marginTop: "0.5rem" }}>Rp {appeal.total.toLocaleString("id-ID")}</p>
              </div>
            </div>

            <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
              <div className="text-error" style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Alasan: {appeal.reason}</div>
              <p className="text-sm">"{appeal.description}"</p>
            </div>

            {appeal.status === "WAITING_SELLER" && (
              <div style={{ background: "var(--color-warning-light)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
                <p className="text-sm"><strong>Aksi Diperlukan:</strong> Anda bisa menyetujui refund, atau menolak. Jika menolak, admin KosEats akan turun tangan menjadi hakim penengah (Eskalasi).</p>
                <div className="flex gap-4" style={{ marginTop: "1rem" }}>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => respondToAppeal(appeal.id, true)}>Terima & Refund</button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => respondToAppeal(appeal.id, false)}>Tolak & Eskalasi ke Admin</button>
                </div>
              </div>
            )}
            
            {appeal.status === "ESCALATED" && (
              <p className="text-sm text-error">Sengketa ini sedang ditinjau oleh Admin KosEats.</p>
            )}
            {appeal.status === "ACCEPTED" && (
              <p className="text-sm text-success">Sengketa selesai. Dana telah dikembalikan ke pembeli.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
