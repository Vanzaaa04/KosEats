"use client";

import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import dynamic from 'next/dynamic';
import { Bell, FileCheck, MapPin, FileText } from "lucide-react";

const TrackingMap = dynamic(() => import('../../components/Map'), { ssr: false });

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingModal, setTrackingModal] = useState({ show: false, orderId: null, lat: -7.280, lng: 112.795 });
  const socketRef = useRef(null);

  useEffect(() => {
    fetchOrders();

    // Init Socket
    if (!socketRef.current) socketRef.current = io(SOCKET_URL);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Listen for tracking updates when modal is open
  useEffect(() => {
    if (trackingModal.show && trackingModal.orderId && socketRef.current) {
      socketRef.current.emit("join_order", trackingModal.orderId);
      
      socketRef.current.on("update_location", (data) => {
        setTrackingModal(prev => ({ ...prev, lat: data.lat, lng: data.lng }));
      });
    }
  }, [trackingModal.show, trackingModal.orderId]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API_URL}/orders/store`, {
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

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        
        // Jika seller yang antar sendiri, nyalakan GPS
        const order = orders.find(o => o.id === id);
        if (newStatus === "DELIVERING" && order.deliveryMethod === "SELLER_DELIVERY") {
          startGPSMock(id);
        }
      } else {
        alert(data.message || "Gagal update status");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  const startGPSMock = (orderId) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit("join_order", orderId);
    let currentLat = -7.280;
    let currentLng = 112.795;
    
    const interval = setInterval(() => {
      currentLat += 0.0002;
      currentLng += 0.0002;
      socketRef.current.emit("send_location", { orderId, lat: currentLat, lng: currentLng });
    }, 2000);

    setTimeout(() => clearInterval(interval), 20000);
  };

  return (
    <div>
      <div className="explore-header">
        <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Bell size={32} className="text-primary" /> Pesanan Masuk</h1>
        <p className="text-muted">Jangan biarkan pelanggan menunggu terlalu lama!</p>
      </div>

      <div className="grid gap-6">
        {loading ? (
          <p>Memuat pesanan...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileCheck size={48} className="text-muted" /></div>
            <p className="empty-state-text">Belum ada pesanan aktif.</p>
          </div>
        ) : orders.map(order => (
          <div className="card" key={order.id} style={{ borderLeft: order.status === "PENDING" ? "4px solid var(--color-error)" : "4px solid var(--color-primary)" }}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <div>
                <h4 style={{ marginBottom: "0.25rem" }}>Order #{order.id}</h4>
                <p className="text-xs text-muted">Dari: <strong>{order.buyer.name}</strong> • {new Date(order.createdAt).toLocaleString("id-ID")}</p>
              </div>
              <div className="text-right">
                <span className={`badge ${order.status === 'PENDING' ? 'badge-error' : 'badge-primary'}`}>
                  {order.status}
                </span>
                <p className="text-primary" style={{ fontWeight: "bold", marginTop: "0.5rem" }}>{formatPrice(order.total)}</p>
                <div style={{ marginTop: "0.5rem" }}>
                  <span className={`badge ${order.paymentMethod === 'COD' ? 'badge-warning' : 'badge-success'}`}>
                    {order.paymentMethod === 'COD' ? 'COD (Bayar Tunai)' : 'Lunas (Xendit)'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
              {order.items.map((item, idx) => (
                <div key={idx} className="text-sm" style={{ marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: "bold", marginRight: "0.5rem" }}>{item.quantity}x</span>
                  {item.menu.name}
                </div>
              ))}
              {order.notes && (
                <div className="text-sm text-warning" style={{ marginTop: "0.5rem", padding: "0.5rem", background: "var(--color-warning-light)", borderRadius: "4px", display: "flex", alignItems: "center" }}>
                  <FileText size={16} style={{ marginRight: "4px" }} /> Catatan: {order.notes}
                </div>
              )}
              {order.paymentMethod === 'COD' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <div className="text-sm text-error" style={{ marginTop: "0.5rem", padding: "0.5rem", background: "rgba(231, 76, 60, 0.1)", borderRadius: "4px", fontWeight: "bold" }}>
                  🚨 PESANAN COD: Jangan lupa tagih uang tunai sebesar {formatPrice(order.total)} saat menyerahkan makanan!
                </div>
              )}
            </div>

            <div className="flex-between">
              <span className="text-sm text-muted">Pengiriman: <strong>{order.deliveryMethod}</strong></span>
              
              <div className="flex gap-2" style={{ marginTop: "1rem" }}>
                {order.status === 'READY_FOR_PICKUP' && order.deliveryMethod === 'PICKUP' && (
                  <button className="btn btn-outline btn-sm" style={{ display: "flex", alignItems: "center" }} onClick={() => setTrackingModal({ show: true, orderId: order.id, lat: -7.280, lng: 112.795, title: "Pembeli Menuju ke Sini" })}>
                    <MapPin size={16} style={{ marginRight: "4px" }} /> Lacak Pembeli
                  </button>
                )}
                {order.status === "PENDING" && (
                  <>
                    <button className="btn btn-danger btn-sm" onClick={() => updateStatus(order.id, "CANCELLED")}>Tolak</button>
                    <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, "CONFIRMED")}>Terima Pesanan</button>
                  </>
                )}
                {order.status === "CONFIRMED" && (
                  <button className="btn btn-primary btn-sm" onClick={() => updateStatus(order.id, "COOKING")}>Mulai Masak</button>
                )}
                {order.status === "COOKING" && (
                  <button className="btn btn-primary btn-sm" onClick={() => updateStatus(order.id, order.deliveryMethod === 'COURIER' ? "WAITING_COURIER" : (order.deliveryMethod === 'PICKUP' ? 'READY_FOR_PICKUP' : "DELIVERING"))}>
                    {order.deliveryMethod === 'PICKUP' ? 'Siap Diambil' : order.deliveryMethod === 'COURIER' ? 'Siap Diambil Kurir' : 'Kirim Makanan'}
                  </button>
                )}
                {order.status === "WAITING_COURIER" && (
                  <span className="text-sm text-warning">Menunggu Kurir...</span>
                )}
                {((order.status === "READY_FOR_PICKUP" && order.deliveryMethod === 'PICKUP') || (order.status === "DELIVERING" && order.deliveryMethod === 'SELLER_DELIVERY')) && (
                  <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, "DELIVERED")}>Tandai Selesai (Diserahkan)</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Lacak Pembeli (Google Maps) */}
      {trackingModal.show && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: "600px" }}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <h3 style={{ color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MapPin size={24} /> {trackingModal.title || "Pelacakan Live"}
              </h3>
              <button onClick={() => setTrackingModal({...trackingModal, show: false})} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}>&times;</button>
            </div>
            <p className="text-sm text-muted" style={{ marginBottom: "1.5rem" }}>Posisi pembeli di-update secara live via WebSocket.</p>
            
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
              <TrackingMap lat={trackingModal.lat} lng={trackingModal.lng} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
