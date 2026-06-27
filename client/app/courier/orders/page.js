"use client";

import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import Navbar from "../../components/Navbar";

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

export default function CourierOrdersPage() {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("AVAILABLE"); // AVAILABLE, MY_JOBS
  
  const socketRef = useRef(null);

  useEffect(() => {
    fetchData();

    socketRef.current = io(SOCKET_URL);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [resAvail, resMy] = await Promise.all([
        fetch(`${API_URL}/courier/orders/available`, { headers: { "Authorization": `Bearer ${token}` } }),
        fetch(`${API_URL}/courier/orders/my`, { headers: { "Authorization": `Bearer ${token}` } })
      ]);

      const dataAvail = await resAvail.json();
      const dataMy = await resMy.json();

      if (dataAvail.success) setAvailableOrders(dataAvail.data);
      if (dataMy.success) setMyOrders(dataMy.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courier/orders/${id}/accept`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert("Berhasil mengambil orderan! Segera jemput makanan ke penjual.");
        fetchData();
        setActiveTab("MY_JOBS");
      } else {
        alert(data.message);
        fetchData();
      }
    } catch (err) {
      alert("Terjadi kesalahan");
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/courier/orders/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (newStatus === "DELIVERING") {
          startGPSMock(id);
          alert("Mode Pengantaran Aktif! GPS Anda disiarkan ke Pembeli.");
        }
        if (newStatus === "DELIVERED") {
          alert("Orderan Selesai! Terima Kasih.");
        }
      }
    } catch (err) {
      alert("Terjadi kesalahan");
    }
  };

  const startGPSMock = (orderId) => {
    if (!socketRef.current) return;
    
    socketRef.current.emit("join_order", orderId);

    // Titik awal (misal di ITS)
    let currentLat = -7.280;
    let currentLng = 112.795;
    
    // Interval jalan tiap 2 detik untuk demonstrasi Google Maps marker bergerak
    const interval = setInterval(() => {
      currentLat += 0.0002; // gerak sedikit ke utara
      currentLng += 0.0002; // gerak sedikit ke timur
      
      socketRef.current.emit("send_location", {
        orderId,
        lat: currentLat,
        lng: currentLng
      });
    }, 2000);

    // Berhenti setelah 20 detik (10 kali jalan) untuk efisiensi demo
    setTimeout(() => {
      clearInterval(interval);
      console.log("Mock GPS stopped for order", orderId);
    }, 20000);
  };

  return (
    <>
      <Navbar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div className="explore-header">
          <h1>🏍️ Dasbor Mitra Kurir</h1>
          <p className="text-muted">Ambil pesanan, antar cepat, dapat cuan tambahan!</p>
        </div>

        <div className="tabs" style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
          <button 
            className={`btn ${activeTab === 'AVAILABLE' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('AVAILABLE')}
          >
            Tawaran Order Masuk ({availableOrders.length})
          </button>
          <button 
            className={`btn ${activeTab === 'MY_JOBS' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('MY_JOBS')}
          >
            Tugas Saya
          </button>
        </div>

        {loading ? (
          <p>Memuat data...</p>
        ) : activeTab === 'AVAILABLE' ? (
          <div className="grid gap-6">
            {availableOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">😴</div>
                <p className="empty-state-text">Belum ada pesanan yang siap diambil.</p>
              </div>
            ) : availableOrders.map(order => (
              <div className="card" key={order.id} style={{ borderLeft: "4px solid var(--color-warning)" }}>
                <div className="flex-between">
                  <div>
                    <h4>{order.store.name}</h4>
                    <p className="text-sm text-muted">Ambil di: {order.store.address}</p>
                  </div>
                  <h4 className="text-success">+ Rp 5.000</h4>
                </div>
                <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", margin: "1rem 0" }}>
                  <p className="text-sm"><strong>Antar ke:</strong> {order.buyer.name}</p>
                  <p className="text-sm text-muted">{order.buyer.address || "Area Kampus"}</p>
                </div>
                <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => acceptOrder(order.id)}>
                  Terima Orderan Ini
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {myOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <p className="empty-state-text">Anda belum mengambil tugas pengantaran.</p>
              </div>
            ) : myOrders.map(order => (
              <div className="card" key={order.id} style={{ borderLeft: `4px solid ${order.status === 'DELIVERED' ? 'var(--color-success)' : 'var(--color-primary)'}` }}>
                <div className="flex-between" style={{ marginBottom: "1rem" }}>
                  <div>
                    <h4>Order #{order.id}</h4>
                    <p className="text-sm">Dari: <strong>{order.store.name}</strong></p>
                  </div>
                  <span className={`badge ${order.status === 'DELIVERED' ? 'badge-success' : 'badge-primary'}`}>
                    {order.status}
                  </span>
                </div>

                <div style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}>
                  <p className="text-sm"><strong>Penerima:</strong> {order.buyer.name} ({order.buyer.phone || "-"})</p>
                  <p className="text-sm text-muted">Tujuan: {order.buyer.address || "Area Kampus"}</p>
                </div>

                {order.status === 'WAITING_COURIER' && (
                  <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => updateStatus(order.id, "DELIVERING")}>
                    Mulai Antar (Aktifkan Live GPS)
                  </button>
                )}
                {order.status === 'DELIVERING' && (
                  <button className="btn btn-success" style={{ width: "100%" }} onClick={() => updateStatus(order.id, "DELIVERED")}>
                    Selesaikan Pesanan
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
