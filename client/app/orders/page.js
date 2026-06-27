"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import io from 'socket.io-client';
import dynamic from 'next/dynamic';

const TrackingMap = dynamic(() => import('../components/Map'), { ssr: false });

/**
 * Halaman Pesanan Pembeli (Orders)
 * Menampilkan daftar pesanan dengan status tracking 4 tahap.
 */

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

const STATUS_STEPS = [
  { value: "PENDING", label: "Menunggu Konfirmasi" },
  { value: "CONFIRMED", label: "Dikonfirmasi" },
  { value: "COOKING", label: "Sedang Dimasak" },
  { value: "DELIVERING", label: "Sedang Diantar" },
  { value: "DELIVERED", label: "Selesai" },
];

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [reviewModal, setReviewModal] = useState({ show: false, orderId: null, rating: 5, comment: "" });
  const [appealModal, setAppealModal] = useState({ show: false, orderId: null, reason: "Makanan basi / rusak", description: "", photoUrl: "" });
  const [trackingModal, setTrackingModal] = useState({ show: false, orderId: null, lat: -7.280, lng: 112.795 });
  const [cancelModal, setCancelModal] = useState({ show: false, orderId: null, reason: "" });
  
  const socketRef = useRef(null);

  // Effect for Tracking Socket
  useEffect(() => {
    if (trackingModal.show && trackingModal.orderId) {
      if (!socketRef.current) socketRef.current = io(SOCKET_URL);
      socketRef.current.emit("join_order", trackingModal.orderId);
      
      socketRef.current.on("update_location", (data) => {
        setTrackingModal(prev => ({ ...prev, lat: data.lat, lng: data.lng }));
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [trackingModal.show, trackingModal.orderId]);

  const startBuyerGPS = (orderId) => {
    if (!socketRef.current) socketRef.current = io(SOCKET_URL);
    socketRef.current.emit("join_order", orderId);
    
    let currentLat = -7.285;
    let currentLng = 112.790;
    
    alert("Mock GPS dinyalakan! Menyiarkan pergerakan Anda ke Penjual secara live...");
    
    const interval = setInterval(() => {
      currentLat += 0.0003;
      currentLng += 0.0003;
      socketRef.current.emit("send_location", { orderId, lat: currentLat, lng: currentLng });
    }, 2000);
    
    // Stop mock after 30 seconds
    setTimeout(() => clearInterval(interval), 30000);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/orders/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIndex = (status) => {
    return STATUS_STEPS.findIndex(s => s.value === status) || 0;
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ orderId: reviewModal.orderId, rating: reviewModal.rating, comment: reviewModal.comment })
      });
      const data = await res.json();
      if (data.success) {
        setReviewModal({ show: false, orderId: null, rating: 5, comment: "" });
        fetchOrders();
        alert("Ulasan berhasil dikirim!");
      } else {
        alert(data.message || "Gagal mengirim ulasan.");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  const submitAppeal = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/appeals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ orderId: appealModal.orderId, reason: appealModal.reason, description: appealModal.description })
      });
      const data = await res.json();
      if (data.success) {
        setAppealModal({ show: false, orderId: null, reason: "Makanan basi / rusak", description: "", photoUrl: "" });
        fetchOrders();
        alert("Banding berhasil diajukan! Menunggu respon penjual.");
      } else {
        alert(data.message || "Gagal mengajukan banding.");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  const submitCancel = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${cancelModal.orderId}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ reason: cancelModal.reason })
      });
      const data = await res.json();
      if (data.success) {
        setCancelModal({ show: false, orderId: null, reason: "" });
        fetchOrders();
        alert("Pesanan berhasil dibatalkan.");
      } else {
        alert(data.message || "Gagal membatalkan pesanan.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghubungi server.");
    }
  };

  return (
    <>
      <Navbar />
      <main className="page-content">
        <div className="container" style={{ maxWidth: "800px" }}>
          <div className="explore-header">
            <h1>Pesanan Saya 📋</h1>
            <p className="text-muted">Pantau status pesananmu di sini.</p>
          </div>

          {loading ? (
            <div className="flex-center" style={{ padding: "3rem" }}>
              <div className="spinner" />
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏍️</div>
              <p className="empty-state-text">Belum ada pesanan aktif.</p>
              <Link href="/explore" className="btn btn-primary">Pesan Sekarang</Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {orders.map(order => {
                const currentIndex = getStatusIndex(order.status);
                
                return (
                  <div className="card" key={order.id}>
                    <div className="flex-between" style={{ marginBottom: "1rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
                      <div>
                        <h4 style={{ marginBottom: "0.25rem" }}>{order.store.name}</h4>
                        <p className="text-xs text-muted">Order ID: {order.midtransOrderId || `KE-${order.id}`}</p>
                      </div>
                      <div className="text-right">
                        <span className={`badge ${order.status === 'CANCELLED' ? 'badge-error' : order.status === 'DELIVERED' ? 'badge-success' : 'badge-primary'}`}>
                          {order.status === 'CANCELLED' ? 'Dibatalkan' : STATUS_STEPS[currentIndex]?.label || order.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress Tracking (Hanya jika tidak dicancel) */}
                    {order.status !== 'CANCELLED' && (
                      <div className="order-status" style={{ margin: "1.5rem 0 2rem" }}>
                        {[1, 2, 3, 4].map((step, index) => {
                          const isActive = currentIndex === index + 1; 
                          const isCompleted = currentIndex > index; 
                          
                          return (
                            <div className={`order-status-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`} key={step}>
                              <div className="order-status-dot">{isCompleted ? '✓' : step}</div>
                              <span className="order-status-label" style={{ marginTop: "0.5rem" }}>
                                {STATUS_STEPS[index + 1].label}
                              </span>
                              {index < 3 && <div className={`order-status-line ${currentIndex > index + 1 ? 'completed' : ''}`} style={{ position: "absolute", width: "100%", left: "50%", top: "16px", zIndex: 1 }} />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
                      {order.items.map(item => (
                        <div key={item.id} className="flex-between" style={{ marginBottom: "0.5rem" }}>
                          <span className="text-sm">
                            <span style={{ fontWeight: "bold", marginRight: "0.5rem" }}>{item.quantity}x</span>
                            {item.menu.name}
                          </span>
                          <span className="text-sm">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <hr style={{ borderTop: "1px dashed var(--color-border-dark)", margin: "0.5rem 0" }} />
                      <div className="flex-between">
                        <span className="text-sm text-muted">Ongkir ({order.deliveryMethod})</span>
                        <span className="text-sm">{formatPrice(order.deliveryFee)}</span>
                      </div>
                      {order.discountAmount > 0 && (
                        <div className="flex-between text-error" style={{ marginTop: "0.25rem" }}>
                          <span className="text-sm">Diskon</span>
                          <span className="text-sm">-{formatPrice(order.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex-between" style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
                        <span style={{ fontWeight: "bold" }}>Total Pembayaran</span>
                        <span className="text-primary" style={{ fontWeight: "bold" }}>{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    <div className="flex" style={{ gap: "1rem", justifyContent: "flex-end" }}>
                      {['WAITING_COURIER', 'READY_FOR_PICKUP', 'DELIVERING'].includes(order.status) && (
                        <Link href={`/orders/${order.id}`} className="btn btn-outline btn-sm">📍 Lacak & Chat</Link>
                      )}
                      {order.status === 'READY_FOR_PICKUP' && order.deliveryMethod === 'PICKUP' && (
                        <button className="btn btn-outline btn-sm" onClick={() => startBuyerGPS(order.id)}>🏃 Mulai Jalan (Pancarkan Lokasi)</button>
                      )}
                      {order.status === 'DELIVERED' && !order.review && !order.appeal && (
                        <button className="btn btn-primary btn-sm" onClick={() => setReviewModal({ show: true, orderId: order.id, rating: 5, comment: "" })}>⭐ Beri Ulasan</button>
                      )}
                      {order.status === 'DELIVERED' && !order.appeal && (
                        <button className="btn btn-danger btn-sm" onClick={() => setAppealModal({ show: true, orderId: order.id, reason: "Makanan basi / rusak", description: "", photoUrl: "" })}>⚠️ Ajukan Banding (Refund)</button>
                      )}
                      {order.appeal && (
                        <span className="text-sm text-error">Banding Status: <strong>{order.appeal.status}</strong></span>
                      )}
                      {order.status === 'PENDING' && (
                        <button className="btn btn-outline btn-sm" onClick={() => setCancelModal({ show: true, orderId: order.id, reason: "" })}>Batalkan Pesanan</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Lacak Kurir / Seller (Google Maps) */}
        {trackingModal.show && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="card" style={{ width: "100%", maxWidth: "600px" }}>
              <div className="flex-between" style={{ marginBottom: "1rem" }}>
                <h3 style={{ color: "var(--color-primary)" }}>{trackingModal.title || "📍 Pelacakan Live"}</h3>
                <button onClick={() => setTrackingModal({...trackingModal, show: false})} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
              </div>
              <p className="text-sm text-muted" style={{ marginBottom: "1.5rem" }}>Posisi kurir di-update secara live via WebSocket.</p>
              
              <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                <TrackingMap lat={trackingModal.lat} lng={trackingModal.lng} />
              </div>
            </div>
          </div>
        )}

        {/* Modal Beri Ulasan */}
        {reviewModal.show && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="card" style={{ width: "100%", maxWidth: "500px" }}>
              <h3 style={{ marginBottom: "1.5rem" }}>⭐ Beri Ulasan</h3>
              <form onSubmit={submitReview}>
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <select className="form-input" value={reviewModal.rating} onChange={e => setReviewModal({...reviewModal, rating: parseInt(e.target.value)})}>
                    <option value="5">⭐⭐⭐⭐⭐ (Sangat Puas)</option>
                    <option value="4">⭐⭐⭐⭐ (Puas)</option>
                    <option value="3">⭐⭐⭐ (Biasa Saja)</option>
                    <option value="2">⭐⭐ (Kurang Puas)</option>
                    <option value="1">⭐ (Sangat Kecewa)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Komentar</label>
                  <textarea className="form-input" rows="3" placeholder="Masakan ibu enak banget!" value={reviewModal.comment} onChange={e => setReviewModal({...reviewModal, comment: e.target.value})}></textarea>
                </div>
                <div className="flex gap-4">
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setReviewModal({...reviewModal, show: false})}>Batal</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Kirim Ulasan</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Ajukan Banding */}
        {appealModal.show && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="card" style={{ width: "100%", maxWidth: "500px" }}>
              <h3 style={{ marginBottom: "1.5rem", color: "var(--color-error)" }}>⚠️ Ajukan Banding (Sengketa)</h3>
              <p className="text-sm text-muted" style={{ marginBottom: "1.5rem" }}>Dana pesanan akan ditahan sampai sengketa diselesaikan antara Anda, penjual, dan admin.</p>
              <form onSubmit={submitAppeal}>
                <div className="form-group">
                  <label className="form-label">Alasan Banding</label>
                  <select className="form-input" value={appealModal.reason} onChange={e => setAppealModal({...appealModal, reason: e.target.value})}>
                    <option value="Makanan basi / rusak">Makanan basi / rusak</option>
                    <option value="Pesanan tidak sesuai">Pesanan tidak sesuai pesanan</option>
                    <option value="Barang kurang">Barang/porsi kurang lengkap</option>
                    <option value="Benda asing pada makanan">Ada benda asing pada makanan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Penjelasan Detail</label>
                  <textarea className="form-input" rows="3" required placeholder="Jelaskan kendala yang Anda alami..." value={appealModal.description} onChange={e => setAppealModal({...appealModal, description: e.target.value})}></textarea>
                </div>
                <div className="flex gap-4">
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAppealModal({...appealModal, show: false})}>Batal</button>
                  <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>Ajukan Sekarang</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Batalkan Pesanan */}
        {cancelModal.show && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="card" style={{ width: "100%", maxWidth: "450px" }}>
              <h3 style={{ color: "var(--color-error)", marginBottom: "0.5rem" }}>⚠️ Batalkan Pesanan?</h3>
              <p className="text-muted" style={{ marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                Apakah Anda yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat dibatalkan dan stok akan dikembalikan ke penjual.
              </p>
              <form onSubmit={submitCancel}>
                <div className="form-group">
                  <label className="form-label">Alasan Pembatalan (Opsional)</label>
                  <select className="form-input" value={cancelModal.reason} onChange={e => setCancelModal({...cancelModal, reason: e.target.value})}>
                    <option value="">Pilih Alasan...</option>
                    <option value="Ingin mengubah pesanan">Ingin mengubah pesanan</option>
                    <option value="Berubah pikiran">Berubah pikiran / Tidak jadi beli</option>
                    <option value="Penjual terlalu lama merespon">Penjual terlalu lama merespon</option>
                    <option value="Alasan lainnya">Lainnya</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setCancelModal({ show: false, orderId: null, reason: "" })}>Kembali</button>
                  <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>Ya, Batalkan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
