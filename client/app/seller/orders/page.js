"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from '../../lib/supabaseClient';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Bell, FileCheck, MapPin, FileText } from "lucide-react";

const TrackingMap = dynamic(() => import('../../components/Map'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;
// SOCKET_URL removed (using Supabase Realtime)

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackingModal, setTrackingModal] = useState({ show: false, orderId: null, lat: -7.280, lng: 112.795 });
  const channelRef = useRef(null);

  useEffect(() => {
    fetchOrders();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

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
          startLiveTracking(id);
        }
      } else {
        alert(data.message || "Gagal update status");
      }
    } catch (err) {
      alert("Terjadi kesalahan.");
    }
  };

  const handleTakeover = async (orderId, action) => {
    if (!confirm("Apakah Anda yakin ingin mengambil alih pengantaran pesanan ini?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${orderId}/seller-takeover`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        alert("Berhasil mengambil alih pesanan!");
        fetchOrders();
      } else {
        alert(data.message || "Gagal mengambil alih pesanan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem.");
    }
  };

  const startLiveTracking = (orderId) => {
    if (!channelRef.current) {
      channelRef.current = supabase.channel(`order_tracking_${orderId}`);
      channelRef.current.subscribe();
    }

    if (!navigator.geolocation) {
      console.warn("Geolocation tidak didukung. Menggunakan mock.");
      startGPSMock(orderId);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        channelRef.current.send({
          type: 'broadcast',
          event: 'update_location',
          payload: {
            orderId,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        });
      },
      (error) => {
        console.warn("Gagal akses GPS. Menggunakan mock.", error);
        startGPSMock(orderId);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    window.activeWatchId = watchId;
  };

  const startGPSMock = (orderId) => {
    if (!channelRef.current) {
      channelRef.current = supabase.channel(`order_tracking_${orderId}`);
      channelRef.current.subscribe();
    }
    
    let currentLat = -7.280;
    let currentLng = 112.795;
    
    const interval = setInterval(() => {
      currentLat += 0.0002;
      currentLng += 0.0002;
      channelRef.current.send({
        type: 'broadcast',
        event: 'update_location',
        payload: { orderId, lat: currentLat, lng: currentLng }
      });
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
                  <span className={`badge ${order.paymentMethod === 'COD' ? 'badge-warning' : (order.paymentMethod === 'TRANSFER_MANUAL' ? 'badge-info' : 'badge-success')}`}>
                    {order.paymentMethod === 'COD' ? 'COD (Bayar Tunai)' : (order.paymentMethod === 'TRANSFER_MANUAL' ? 'Transfer Manual' : 'Lunas (Xendit)')}
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
              {order.paymentMethod === 'TRANSFER_MANUAL' && order.status === 'PENDING' && (
                <div style={{ marginTop: "1rem", padding: "1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                  <p style={{ fontWeight: "bold", margin: "0 0 0.5rem 0", color: "#166534" }}>Bukti Transfer Manual</p>
                  {order.transferProofUrl ? (
                    <div>
                      <a href={order.transferProofUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", color: "var(--color-primary)", textDecoration: "underline", marginBottom: "0.5rem" }}>
                        Lihat Bukti Transfer
                      </a>
                      <p style={{ fontSize: "0.875rem", color: "#166534", margin: 0 }}>Silakan periksa mutasi rekening Anda. Jika sesuai, tekan "Terima Pesanan".</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.875rem", color: "#991b1b", margin: 0 }}>⏳ Menunggu pembeli mengunggah bukti transfer...</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex-between">
              <span className="text-sm text-muted">Pengiriman: <strong>{order.deliveryMethod}</strong></span>
              
              <div className="flex gap-2" style={{ marginTop: "1rem" }}>
                {['WAITING_COURIER', 'READY_FOR_PICKUP', 'DELIVERING'].includes(order.status) && (
                  <Link href={`/seller/orders/${order.id}`} className="btn btn-outline btn-sm" style={{ display: "flex", alignItems: "center" }}>
                    <MapPin size={16} style={{ marginRight: "4px" }} /> Lacak & Chat
                  </Link>
                )}
                {order.status === "PENDING" && (
                  <>
                    <button className="btn btn-danger btn-sm" onClick={() => updateStatus(order.id, "CANCELLED")}>Tolak</button>
                    {order.paymentMethod === 'TRANSFER_MANUAL' && !order.transferProofUrl ? (
                      <button className="btn btn-secondary btn-sm" disabled title="Menunggu pembeli unggah bukti transfer">Menunggu Bukti Transfer</button>
                    ) : (
                      <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, "CONFIRMED")}>
                        {order.paymentMethod === 'TRANSFER_MANUAL' ? "Verifikasi & Terima" : "Terima Pesanan"}
                      </button>
                    )}
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
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                    <span className="text-sm text-warning" style={{ fontWeight: "bold" }}>Menunggu Kurir...</span>
                    <button className="btn btn-primary btn-sm" onClick={() => handleTakeover(order.id, 'SELLER_DELIVERY')}>
                      Saya Antar Sendiri
                    </button>
                  </div>
                )}
                {((order.status === "READY_FOR_PICKUP" && order.deliveryMethod === 'PICKUP') || (order.status === "DELIVERING" && order.deliveryMethod === 'SELLER_DELIVERY')) && (
                  <button className="btn btn-success btn-sm" onClick={() => updateStatus(order.id, "DELIVERED")}>Tandai Selesai (Diserahkan)</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>


    </div>
  );
}
