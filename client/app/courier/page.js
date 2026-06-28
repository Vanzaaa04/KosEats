"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hourglass, Map, Search, MapPin, Wallet, Star, Package, RefreshCw, CheckCircle } from "lucide-react";

export default function CourierDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ todayIncome: 0, completedTrips: 0, avgRating: 0, walletBalance: 0 });
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data.courierProfile) {
          setUser(data.data);
          localStorage.setItem("user", JSON.stringify(data.data));
        } else {
          console.error("auth/me failed or no courier profile", data);
          // router.push("/"); // REMOVED to prevent infinite loop
        }
      } catch (error) {
        console.error("Failed to load courier", error);
        // router.push("/"); // REMOVED to prevent infinite loop
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    window.addEventListener("userUpdated", fetchUser);
    return () => window.removeEventListener("userUpdated", fetchUser);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    
    const fetchStatsAndOrders = async () => {
      const token = localStorage.getItem("token");
      
      // Fetch stats
      try {
        const resStats = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/courier/stats`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const dataStats = await resStats.json();
        if (dataStats.success) {
          setStats(dataStats.data);
        }
      } catch (err) {}

      // Fetch Orders only if online
      if (user.courierProfile?.isOnline) {
        try {
          const resOrders = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/courier/orders/available`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const dataOrders = await resOrders.json();
          if (dataOrders.success) {
            setAvailableOrders(dataOrders.data);
          }
        } catch (err) {}
      }
    };

    fetchStatsAndOrders();
    const interval = setInterval(fetchStatsAndOrders, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const acceptOrder = async (orderId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5000/api/courier/orders/${orderId}/accept`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert("Pesanan berhasil diambil! Segera jemput makanannya.");
        // Should redirect to order tracking page in the future
      } else {
        alert(data.message || "Gagal mengambil pesanan. Mungkin sudah diambil kurir lain.");
      }
    } catch (err) {
      alert("Terjadi kesalahan server");
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: "100vh" }}>
        <p>Memuat tugas kurir...</p>
      </div>
    );
  }

  const isPending = user?.courierProfile?.status === "PENDING";

  return (
    <>
      <div style={{ background: "transparent", padding: "1rem" }}>
        {isPending ? (
          <div className="flex-center" style={{ flexDirection: "column", minHeight: "60vh", textAlign: "center" }}>
            <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "2rem", borderRadius: "50%", marginBottom: "1.5rem" }}>
              <Hourglass size={64} color="#f59e0b" />
            </div>
            <h2 style={{ marginBottom: "0.5rem" }}>Menunggu Persetujuan Admin</h2>
            <p className="text-muted" style={{ maxWidth: "500px" }}>
              Akun Driver dan kelengkapan data kendaraan Anda sedang dalam antrean verifikasi oleh Admin KosEats (Maksimal 1x24 Jam). Mohon bersabar dan cek kembali secara berkala.
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <h2>Dashboard Kurir</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-primary)", fontWeight: "bold" }}>
                <span className="pulsing-dot" style={{ width: "12px", height: "12px", backgroundColor: "var(--color-primary)", borderRadius: "50%", display: "inline-block" }}></span>
                Sedang Aktif (Radar ON)
              </div>
            </div>

            <div className="dashboard-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              <div className="stat-card" style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Wallet size={32} color="#10b981" style={{ marginBottom: "0.5rem" }} />
                <span className="text-muted text-sm">Saldo Dompet</span>
                <h3 style={{ margin: "0.25rem 0", color: "#10b981" }}>Rp {stats.walletBalance.toLocaleString("id-ID")}</h3>
              </div>
              <div className="stat-card" style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Wallet size={32} color="var(--color-primary)" style={{ marginBottom: "0.5rem" }} />
                <span className="text-muted text-sm">Pendapatan Hari Ini</span>
                <h3 style={{ margin: "0.25rem 0" }}>Rp {stats.todayIncome.toLocaleString("id-ID")}</h3>
              </div>
              <div className="stat-card" style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <CheckCircle size={32} color="var(--color-primary)" style={{ marginBottom: "0.5rem" }} />
                <span className="text-muted text-sm">Trip Selesai</span>
                <h3 style={{ margin: "0.25rem 0" }}>{stats.completedTrips} Trip</h3>
              </div>
              <div className="stat-card" style={{ background: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Star size={32} color="var(--color-warning)" fill="var(--color-warning)" style={{ marginBottom: "0.5rem" }} />
                <span className="text-muted text-sm">Rating Saya</span>
                <h3 style={{ margin: "0.25rem 0" }}>{stats.avgRating.toFixed(1)} / 5.0</h3>
              </div>
            </div>

            <div className="card" style={{ padding: "0", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", background: "var(--color-border)" }}>
              {/* Left: Radar List */}
              <div style={{ background: "white", padding: "1.5rem", minHeight: "500px" }}>
                <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <RefreshCw className={isScanning ? "spinner" : ""} size={20} color="var(--color-primary)" />
                  Radar Pesanan Sekitar
                </h3>
                
                {availableOrders.length === 0 ? (
                  <div className="flex-center" style={{ flexDirection: "column", height: "80%", color: "var(--color-muted)", textAlign: "center" }}>
                    <Search size={48} style={{ opacity: 0.5, marginBottom: "1rem" }} />
                    <p style={{ margin: 0 }}>Belum ada orderan yang butuh diantar saat ini.</p>
                    <p className="text-sm">Tunggu sebentar, pesanan akan muncul di sini.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {availableOrders.map(order => (
                      <div key={order.id} style={{ border: "2px solid #e2e8f0", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div>
                          <h4 style={{ margin: "0 0 0.5rem 0" }}>Order #{order.id} - Rp {order.deliveryFee.toLocaleString("id-ID")}</h4>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                            <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <div>
                              <strong>Jemput:</strong> {order.store.name}<br />
                              <span className="text-muted">{order.store.address}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.9rem" }}>
                            <MapPin size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <div>
                              <strong>Antar ke:</strong> {order.buyer.name}<br />
                              <span className="text-muted">{order.buyer.address}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => acceptOrder(order.id)} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem", fontSize: "1rem", fontWeight: "bold" }}>
                          TERIMA TUGAS
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Right: Map Area */}
              <div style={{ background: "#e5e7eb", minHeight: "500px", position: "relative" }}>
                <div className="flex-center" style={{ height: "100%", color: "#9ca3af", flexDirection: "column" }}>
                  <Map size={48} style={{ marginBottom: "1rem" }} />
                  <p>Live Map Radar KosEats</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-dot {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(14, 165, 233, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
        }
        .pulsing-dot {
          animation: pulse-dot 2s infinite;
        }
      `}} />
    </>
  );
}
