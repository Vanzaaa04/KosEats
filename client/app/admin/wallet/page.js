"use client";

import { useState, useEffect } from "react";
import { Search, PlusCircle, CheckCircle, AlertCircle, FileText, Check, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

export default function AdminWalletPage() {
  const [activeTab, setActiveTab] = useState("verify"); // verify | manual

  // Verifikasi State
  const [pendingProofs, setPendingProofs] = useState([]);
  const [loadingProofs, setLoadingProofs] = useState(true);
  
  // Partial approval state
  const [selectedProof, setSelectedProof] = useState(null);
  const [actualAmount, setActualAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");

  // Manual TopUp State
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [loadingManual, setLoadingManual] = useState(false);
  
  // General message state
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (activeTab === "verify") {
      fetchPendingProofs();
    }
  }, [activeTab]);

  const fetchPendingProofs = async () => {
    setLoadingProofs(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/wallet/pending-proofs`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPendingProofs(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProofs(false);
    }
  };

  const handleManualTopUp = async (e) => {
    e.preventDefault();
    setLoadingManual(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/wallet/manual-topup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          amount: parseFloat(amount)
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessageType("success");
        setMessage(data.message);
        setUserId("");
        setAmount("");
      } else {
        setMessageType("error");
        setMessage(data.message || "Gagal melakukan Top-Up.");
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Terjadi kesalahan sistem saat menghubungi server.");
    } finally {
      setLoadingManual(false);
    }
  };

  const handleVerify = async (transactionId, action) => {
    // action: 'APPROVE_FULL' | 'APPROVE_PARTIAL' | 'REJECT'
    
    if (action === 'APPROVE_PARTIAL' && (!actualAmount || actualAmount <= 0)) {
      alert("Harap masukkan nominal aktual yang diterima.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/wallet/verify-proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionId,
          action,
          actualAmount: action === 'APPROVE_PARTIAL' ? parseFloat(actualAmount) : undefined,
          adminNote: adminNote || undefined
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setSelectedProof(null);
        setActualAmount("");
        setAdminNote("");
        fetchPendingProofs();
      } else {
        alert(data.message || "Gagal memproses transaksi.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem.");
    }
  };

  return (
    <div>
      <div className="explore-header">
        <h1>Keuangan & Kasbon 💸</h1>
        <p className="text-muted">Verifikasi bukti transfer dari penjual dan kurir yang melunasi utang kasbon komisi.</p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--color-border)" }}>
        <button 
          className={`btn ${activeTab === "verify" ? "btn-primary" : "btn-outline"}`} 
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: activeTab === "verify" ? "none" : "1px solid var(--color-border)" }}
          onClick={() => { setActiveTab("verify"); setMessage(null); }}
        >
          <FileText size={18} style={{ marginRight: "0.5rem" }} /> Verifikasi Bukti Transfer
        </button>
        <button 
          className={`btn ${activeTab === "manual" ? "btn-primary" : "btn-outline"}`} 
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: activeTab === "manual" ? "none" : "1px solid var(--color-border)" }}
          onClick={() => { setActiveTab("manual"); setMessage(null); }}
        >
          <PlusCircle size={18} style={{ marginRight: "0.5rem" }} /> Suntik Saldo Manual
        </button>
      </div>

      {message && (
        <div style={{
          padding: "1rem", marginBottom: "1.5rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem",
          background: messageType === "success" ? "var(--color-success-light)" : "var(--color-danger-light)",
          color: messageType === "success" ? "var(--color-success)" : "var(--color-danger)",
          border: `1px solid ${messageType === "success" ? "var(--color-success)" : "var(--color-danger)"}`
        }}>
          {messageType === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontWeight: "bold" }}>{message}</span>
        </div>
      )}

      {activeTab === "verify" && (
        <div className="card">
          <h3 style={{ marginBottom: "1.5rem" }}>Antrean Bukti Transfer</h3>
          
          {loadingProofs ? (
            <p>Memuat data...</p>
          ) : pendingProofs.length === 0 ? (
            <div className="text-center" style={{ padding: "3rem 0", color: "var(--color-muted)" }}>
              <CheckCircle size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
              <p>Tidak ada bukti transfer yang perlu diverifikasi.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table-premium">
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border)", textAlign: "left" }}>
                    <th style={{ padding: "1rem" }}>User</th>
                    <th style={{ padding: "1rem" }}>Saldo Saat Ini</th>
                    <th style={{ padding: "1rem" }}>Nominal Klaim</th>
                    <th style={{ padding: "1rem" }}>Bukti Foto</th>
                    <th style={{ padding: "1rem", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingProofs.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "1rem" }}>
                        <strong>{tx.user?.name}</strong><br/>
                        <small className="text-muted">ID: {tx.userId} | {tx.user?.phone}</small>
                      </td>
                      <td style={{ padding: "1rem", color: (tx.user?.walletBalance || 0) < 0 ? "var(--color-danger)" : "var(--color-success)", fontWeight: "bold" }}>
                        Rp {tx.user?.walletBalance?.toLocaleString("id-ID")}
                      </td>
                      <td style={{ padding: "1rem", fontWeight: "bold", fontSize: "1.1rem" }}>
                        Rp {tx.amount.toLocaleString("id-ID")}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <a href={tx.proofUrl} target="_blank" rel="noopener noreferrer">
                          <img src={tx.proofUrl} alt="Bukti Transfer" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--color-border)" }} />
                        </a>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        {selectedProof === tx.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "250px", marginLeft: "auto" }}>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <input 
                                type="number" 
                                className="input-premium" 
                                placeholder="Nominal Asli (Rp)" 
                                value={actualAmount}
                                onChange={e => setActualAmount(e.target.value)}
                                style={{ flex: 1, padding: "0.5rem" }}
                              />
                            </div>
                            <input 
                              type="text" 
                              className="input-premium" 
                              placeholder="Catatan ke Penjual (Opsi)" 
                              value={adminNote}
                              onChange={e => setAdminNote(e.target.value)}
                              style={{ padding: "0.5rem" }}
                            />
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button className="btn btn-warning" style={{ flex: 1, padding: "0.5rem" }} onClick={() => handleVerify(tx.id, 'APPROVE_PARTIAL')}>Simpan (Kurang)</button>
                              <button className="btn btn-outline" style={{ padding: "0.5rem" }} onClick={() => setSelectedProof(null)}>Batal</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button className="btn btn-success" style={{ padding: "0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }} onClick={() => {
                              if (confirm(`Terima penuh pembayaran Rp ${tx.amount.toLocaleString("id-ID")}?`)) {
                                handleVerify(tx.id, 'APPROVE_FULL');
                              }
                            }}>
                              <Check size={16} /> Lunas Penuh
                            </button>
                            <button className="btn btn-warning" style={{ padding: "0.5rem" }} onClick={() => {
                              setSelectedProof(tx.id);
                              setActualAmount(tx.amount);
                            }}>
                              Uang Kurang?
                            </button>
                            <button className="btn btn-danger" style={{ padding: "0.5rem" }} onClick={() => {
                              const note = prompt("Alasan penolakan:");
                              if (note !== null) {
                                setAdminNote(note);
                                handleVerify(tx.id, 'REJECT');
                              }
                            }}>
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "manual" && (
        <div className="card" style={{ maxWidth: "600px" }}>
          <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PlusCircle size={24} color="var(--color-primary)" /> Formulir Top-Up Saldo Tunai
          </h3>

          <form onSubmit={handleManualTopUp} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="form-group">
              <label style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>ID Pengguna (User ID)</label>
              <div style={{ position: "relative" }}>
                <Search size={20} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                <input
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Contoh: 5"
                  required
                  className="input-premium"
                  style={{ paddingLeft: "40px", width: "100%" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>Nominal Uang (Rp)</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontWeight: "bold", color: "var(--color-muted)" }}>Rp</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150000"
                  required
                  min="100"
                  className="input-premium"
                  style={{ paddingLeft: "40px", width: "100%" }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loadingManual}
              style={{ padding: "1rem", fontSize: "1.1rem", fontWeight: "bold" }}
            >
              {loadingManual ? "Memproses..." : "Suntik Saldo Sekarang"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
