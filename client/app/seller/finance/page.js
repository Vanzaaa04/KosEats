"use client";

import { useState, useEffect, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle } from "lucide-react";

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

  // Upload Proof State
  const [amount, setAmount] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("");
  const fileInputRef = useRef(null);

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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!amount || amount <= 0) {
      setMessageType("error");
      setMessage("Harap isi nominal transfer terlebih dahulu sebelum memilih foto!");
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      
      // 1. Upload foto ke Supabase
      const formData = new FormData();
      formData.append("image", file);
      
      const resUpload = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const dataUpload = await resUpload.json();
      
      if (!dataUpload.success) {
        setMessageType("error");
        setMessage("Gagal mengunggah foto.");
        setUploading(false);
        return;
      }
      
      const fullUrl = dataUpload.data.url;

      // 2. Kirim URL foto dan nominal ke backend
      const resProof = await fetch(`${API_URL}/wallet/upload-proof`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          proofUrl: fullUrl
        })
      });
      
      const dataProof = await resProof.json();
      if (dataProof.success) {
        setMessageType("success");
        setMessage(dataProof.message);
        setAmount("");
        fetchFinance(); // Refresh data to show pending status
      } else {
        setMessageType("error");
        setMessage(dataProof.message || "Gagal menyimpan bukti transfer.");
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Terjadi kesalahan sistem.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem" }}><p>Memuat data keuangan...</p></div>;
  }

  const data = finance || {
    totalGross: 0, totalCommission: 0, totalNet: 0,
    totalOrders: 0, recentOrders: [], monthlyBreakdown: []
  };

  const hasPendingProof = wallet?.transactions?.some(tx => tx.type === 'TOP_UP' && tx.status === 'PENDING' && tx.proofUrl);
  const pendingAmount = wallet?.transactions?.find(tx => tx.type === 'TOP_UP' && tx.status === 'PENDING' && tx.proofUrl)?.amount || 0;

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
            <div style={{ marginTop: "1.5rem", background: "#fff", color: "var(--color-text)", padding: "1.5rem", borderRadius: "8px", textAlign: "left", border: "2px solid var(--color-danger)" }}>
              <p style={{ fontWeight: "bold", color: "var(--color-danger)", marginBottom: "0.5rem", fontSize: "1.1rem" }}>⚠️ Anda Memiliki Tunggakan Komisi (Kasbon)</p>
              <p style={{ fontSize: "0.95rem", marginBottom: "1rem" }}>
                Batas maksimal tunggakan Anda adalah <strong>Rp -150.000</strong>. Jika melampaui, fitur COD Seller Delivery akan diblokir otomatis. Segera lunasi tunggakan Anda dengan transfer ke:
              </p>
              <div style={{ background: "var(--color-primary-light)", padding: "1rem", borderRadius: "8px", border: "1px dashed var(--color-primary)", marginBottom: "1.5rem", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-primary)", fontWeight: "bold" }}>Gopay / DANA Admin KosEats</p>
                <h2 style={{ margin: "0.5rem 0", color: "var(--color-primary)" }}>0812-4837-4480</h2>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-primary)" }}>(A.n. Bos KosEats)</p>
              </div>

              {hasPendingProof ? (
                <div style={{ padding: "1rem", background: "var(--color-warning-light)", color: "var(--color-warning)", borderRadius: "8px", border: "1px solid var(--color-warning)", textAlign: "center" }}>
                  <h4 style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <AlertCircle size={20} /> Bukti Transfer Rp {pendingAmount.toLocaleString('id-ID')} Sedang Dicek
                  </h4>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>Harap tunggu konfirmasi dari Admin. Saldo Anda akan otomatis bertambah jika sudah disetujui.</p>
                </div>
              ) : (
                <div>
                  <h4 style={{ marginBottom: "1rem" }}>Formulir Konfirmasi Pembayaran</h4>
                  
                  {message && (
                    <div style={{ padding: "0.75rem", marginBottom: "1rem", borderRadius: "8px", background: messageType === "success" ? "var(--color-success-light)" : "var(--color-danger-light)", color: messageType === "success" ? "var(--color-success)" : "var(--color-danger)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {messageType === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {message}
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: "1rem" }}>
                    <label style={{ fontSize: "0.9rem", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>Nominal yang ditransfer (Rp)</label>
                    <input 
                      type="number" 
                      className="input-premium" 
                      placeholder={`Misal: ${Math.abs(wallet.balance)}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={uploading}
                      style={{ width: "100%" }}
                    />
                  </div>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: "none" }} 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                  >
                    <UploadCloud size={20} />
                    {uploading ? "Mengunggah Foto..." : "Upload Foto Bukti Transfer"}
                  </button>
                </div>
              )}
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

      {/* Riwayat Transaksi Dompet (Termasuk Kasbon & TopUp) */}
      {wallet && wallet.transactions && wallet.transactions.length > 0 && (
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h4 style={{ marginBottom: "1rem" }}>📝 Riwayat Dompet & Pelunasan</h4>
          <div style={{ overflowX: "auto" }}>
            <table className="table-premium">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>Tipe</th>
                  <th style={{ padding: "0.75rem" }}>Nominal</th>
                  <th style={{ padding: "0.75rem" }}>Status</th>
                  <th style={{ padding: "0.75rem" }}>Keterangan</th>
                  <th style={{ padding: "0.75rem" }}>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {wallet.transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.75rem" }}>
                      {tx.type === 'TOP_UP' ? <span className="badge badge-success">Pelunasan</span> : 
                       tx.type === 'COMMISSION_DEDUCTION' ? <span className="badge badge-danger">Potongan Komisi</span> : 
                       <span className="badge badge-primary">Penerimaan</span>}
                    </td>
                    <td style={{ padding: "0.75rem", fontWeight: "bold", color: tx.amount > 0 ? "var(--color-success)" : "var(--color-danger)" }}>
                      {tx.amount > 0 ? "+" : ""}{formatPrice(tx.amount)}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span className={`badge badge-${tx.status === 'PAID' ? 'success' : tx.status === 'PENDING' ? 'warning' : 'danger'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                      {tx.description}
                      {tx.adminNote && (
                        <div style={{ marginTop: "0.25rem", color: "var(--color-danger)", fontWeight: "bold", fontSize: "0.8rem" }}>
                          Catatan Admin: {tx.adminNote}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "var(--font-size-sm)" }}>{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Riwayat Pesanan */}
      <div className="card">
        <h4 style={{ marginBottom: "1rem" }}>🧾 Riwayat Transaksi Pesanan Terbaru</h4>
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
