"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import dynamic from "next/dynamic";
import { supabase } from '../../lib/supabaseClient';
import { Send, Image as ImageIcon, MapPin, ArrowLeft, PackageSearch, CheckCircle, AlertTriangle, UploadCloud, Wallet } from "lucide-react";

const TrackingMap = dynamic(() => import("../../components/Map"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;
// SOCKET_URL removed (using Supabase Realtime)

export default function OrderDetailPage({ params }) {
  // Use React.use() to unwrap params in Next.js 15
  const resolvedParams = use(params);
  const orderId = parseInt(resolvedParams.id);
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [user, setUser] = useState(null);
  
  // Tracking
  const [courierLocation, setCourierLocation] = useState(null);
  const channelRef = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchOrderDetails();
    fetchMessages();
  }, [orderId]);

  useEffect(() => {
    if (!user) return;

    if (!channelRef.current) {
      channelRef.current = supabase.channel(`order_${orderId}`);
      
      channelRef.current.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
        (payload) => {
          const msgDB = payload.new;
          if (msgDB.sender_id !== user.id) {
            const msg = {
              id: msgDB.id,
              orderId: msgDB.order_id,
              senderId: msgDB.sender_id,
              receiverId: msgDB.receiver_id,
              content: msgDB.content,
              photoUrl: msgDB.photo_url,
              createdAt: msgDB.created_at,
              sender: { name: "Lawan Bicara" }
            };
            setMessages((prev) => [...prev, msg]);
            setTimeout(scrollToBottom, 300);
          }
        }
      );

      channelRef.current.on(
        'broadcast',
        { event: 'update_location' },
        (payload) => {
          setCourierLocation({ lat: payload.payload.lat, lng: payload.payload.lng });
        }
      );

      channelRef.current.subscribe();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, orderId]);

  useEffect(() => {
    let watchId;
    if (order && channelRef.current && order.deliveryMethod === 'PICKUP' && ['COOKING', 'READY_FOR_PICKUP'].includes(order.status)) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setCourierLocation({ lat, lng });
            channelRef.current.send({
              type: 'broadcast',
              event: 'update_location',
              payload: { orderId: order.id, lat, lng }
            });
          },
          (err) => console.error("GPS error:", err),
          { enableHighAccuracy: true }
        );
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [order]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const found = data.data.find(o => o.id === orderId);
        if (found) {
          setOrder(found);
          if (!courierLocation) {
            setCourierLocation({ lat: found.store.latitude || -7.280, lng: found.store.longitude || 112.795 });
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/chat/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
        setTimeout(scrollToBottom, 300);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (content = null, photoUrl = null) => {
    if (!content && !photoUrl) return;

    const msgData = {
      orderId,
      senderId: user.id,
      // For simplicity, buyer sends to store userId
      receiverId: order?.store?.userId || 0, 
      content,
      photoUrl,
    };

    // Optimistic UI update
    const optimisticMsg = {
      ...msgData,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      sender: { name: user.name }
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage("");
    scrollToBottom();

    // Send via socket removed, using DB listen

    // Save to DB
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(msgData)
      });
    } catch (err) {
      console.error("Failed to save message", err);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(newMessage, null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        // fileUrl is e.g. /public/uploads/file-123.jpg
        const fullUrl = data.data.url;
        sendMessage(null, fullUrl);
      } else {
        alert("Gagal upload foto");
      }
    } catch (err) {
      console.error(err);
      alert("Error upload foto");
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  const handleTransferProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingProof(true);
    const formData = new FormData();
    formData.append("image", file);
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      
      if (data.success) {
        const fullUrl = data.data.url;
        const resPut = await fetch(`${API_URL}/orders/${orderId}/transfer-proof`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ transferProofUrl: fullUrl })
        });
        const putData = await resPut.json();
        if (putData.success) {
          setOrder({ ...order, transferProofUrl: fullUrl });
          alert("Bukti transfer berhasil diunggah!");
        } else {
          alert(putData.message || "Gagal menyimpan bukti transfer.");
        }
      } else {
        alert("Gagal upload foto");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat upload");
    } finally {
      setUploadingProof(false);
      e.target.value = null;
    }
  };

  const handleSwitchToPickup = async () => {
    if (!confirm("Yakin ingin mengambil pesanan ini sendiri? Ongkir akan dikembalikan ke dompet Anda jika menggunakan Xendit atau Transfer Manual.")) return;
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${orderId}/buyer-takeover`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert("Berhasil! Silakan ambil pesanan Anda ke lokasi penjual.");
        fetchOrderDetails();
      } else {
        alert(data.message || "Gagal mengubah pesanan.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan sistem.");
    }
  };

  const getMapMarkers = () => {
    if (!order) return [];
    const markers = [];
    if (order.store?.latitude && order.store?.longitude) {
      markers.push({ lat: order.store.latitude, lng: order.store.longitude, type: "STORE", label: order.store.name });
    }
    if (order.buyer?.latitude && order.buyer?.longitude) {
      markers.push({ lat: order.buyer.latitude, lng: order.buyer.longitude, type: "BUYER", label: "Lokasi Anda" });
    }
    if (courierLocation && order.status === "DELIVERING") {
      markers.push({ 
        lat: courierLocation.lat, 
        lng: courierLocation.lng, 
        type: order.deliveryMethod === "SELLER_DELIVERY" ? "STORE" : "COURIER", 
        label: order.deliveryMethod === "SELLER_DELIVERY" ? "Penjual Sedang Mengantar" : "Kurir KosEats" 
      });
    }
    return markers;
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex-center" style={{ minHeight: "60vh" }}>
          <div className="spinner" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
          <h2>Pesanan tidak ditemukan</h2>
          <Link href="/orders" className="btn btn-primary" style={{ marginTop: "1rem" }}>Kembali</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="page-content" style={{ background: "#f8f9fa", minHeight: "100vh" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <Link href="/orders" className="btn btn-outline" style={{ padding: "0.5rem" }}>
              <ArrowLeft size={20} />
            </Link>
            <h2 style={{ margin: 0 }}>Pesanan {order.midtransOrderId || `KE-${order.id}`}</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
            
            {/* LEFT: Live Map */}
            <div className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                  <MapPin className="text-primary" /> Live Tracking
                </h3>
                <p className="text-sm text-muted" style={{ margin: "0.5rem 0 0" }}>
                  Status: <strong>{order.status}</strong>
                </p>
              </div>

              {order.paymentMethod === 'TRANSFER_MANUAL' && (
                <div style={{ padding: "1.5rem", background: "white", borderBottom: "1px solid var(--color-border)" }}>
                  <h4 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Wallet size={20} className="text-primary"/> Transfer Manual</h4>
                  {order.transferProofUrl ? (
                    <div style={{ padding: "1rem", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "8px", textAlign: "center" }}>
                      <CheckCircle size={32} style={{ margin: "0 auto 0.5rem" }} />
                      <p style={{ fontWeight: "bold", margin: 0 }}>Bukti transfer berhasil diunggah!</p>
                      <p style={{ fontSize: "0.875rem", margin: "0.5rem 0 0" }}>Menunggu verifikasi dari penjual.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px" }}>
                        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", color: "#9a3412" }}>Silakan transfer sebesar <strong>Rp {order.total.toLocaleString('id-ID')}</strong> ke salah satu nomor berikut:</p>
                        <ul style={{ margin: 0, paddingLeft: "1.5rem", color: "#9a3412", fontWeight: "bold" }}>
                          {order.store.gopayNumber && <li>GoPay: {order.store.gopayNumber}</li>}
                          {order.store.danaNumber && <li>DANA: {order.store.danaNumber}</li>}
                          {!order.store.gopayNumber && !order.store.danaNumber && <li>Penjual belum mendaftarkan nomor GoPay/DANA. Harap hubungi penjual via chat.</li>}
                        </ul>
                      </div>
                      
                      <div style={{ border: "2px dashed var(--color-border)", borderRadius: "8px", padding: "2rem", textAlign: "center" }}>
                        <input type="file" id="transferProof" accept="image/*" style={{ display: "none" }} onChange={handleTransferProofUpload} disabled={uploadingProof} />
                        <label htmlFor="transferProof" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                          <UploadCloud size={32} className="text-muted" />
                          <span style={{ fontWeight: "bold", color: "var(--color-primary)" }}>
                            {uploadingProof ? "Mengunggah..." : "Klik untuk Upload Bukti Transfer"}
                          </span>
                          <span className="text-xs text-muted">Format: JPG, PNG (Max 5MB)</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}

              {order.status === 'WAITING_COURIER' && (
                <div style={{ padding: "2rem", textAlign: "center", background: "#f8f9fa", borderBottom: "1px solid var(--color-border)" }}>
                  <div className="pulse" style={{ display: "inline-flex", padding: "1.5rem", background: "var(--color-primary-light)", borderRadius: "50%", marginBottom: "1rem" }}>
                    <PackageSearch size={48} color="var(--color-primary)" />
                  </div>
                  <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem" }}>Mencari Kurir...</h3>
                  <p className="text-muted" style={{ marginBottom: "1rem" }}>Sistem sedang memancarkan sinyal ke kurir di sekitarmu.</p>
                  
                  <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#fff3cd", border: "1px solid #ffeeba", borderRadius: "8px" }}>
                    <p style={{ fontWeight: "bold", color: "#856404", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Kurir tak kunjung datang atau tidak sabar menunggu?</p>
                    <button className="btn btn-warning btn-sm" onClick={handleSwitchToPickup} style={{ width: "100%" }}>
                      Ganti ke Ambil Sendiri (Pick-Up)
                    </button>
                  </div>
                </div>
              )}

              {order.deliveryMethod === 'SELLER_DELIVERY' && order.status !== 'DELIVERED' && (
                <div style={{ padding: "1.5rem", background: "var(--color-success-light)", borderBottom: "2px solid var(--color-success)", textAlign: "center" }}>
                  <h4 style={{ color: "var(--color-success)", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <CheckCircle size={24} /> Hore! Diantar Penjual 🎉
                  </h4>
                  <p style={{ color: "var(--color-success)", fontSize: "0.95rem", margin: 0 }}>
                    Penjual berbaik hati mengambil alih pengantaran makananmu. <strong>Sisa ongkos kirim telah dikembalikan ke Saldo Dompet KosEats kamu!</strong>
                  </p>
                </div>
              )}

              {order.deliveryMethod === 'PICKUP' && order.status !== 'DELIVERED' && (
                <div style={{ padding: "1.5rem", background: "var(--color-warning-light)", borderBottom: "2px solid var(--color-warning)", textAlign: "center" }}>
                  <h4 style={{ color: "#b26f00", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                    <AlertTriangle size={24} /> Mohon Ambil Sendiri (Pick-Up) 🛍️
                  </h4>
                  <p style={{ color: "#8a5600", fontSize: "0.95rem", margin: 0 }}>
                    Maaf, kurir sedang penuh dan penjual sibuk. <strong>Seluruh ongkos kirim telah dikembalikan ke Saldo Dompet KosEats kamu!</strong> Silakan ambil makananmu di resto.
                  </p>
                </div>
              )}

              {/* COURIER INFO CARD */}
              {order.status === "DELIVERING" && order.courier && order.courier.courierProfile && (
                <div style={{ padding: "1rem", background: "#f8f9fa", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <img src={order.courier.photoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=driver"} alt="Courier" style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-primary)" }} />
                  <div>
                    <h4 style={{ margin: "0 0 0.25rem 0" }}>{order.courier.name}</h4>
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-muted)", fontWeight: "bold" }}>
                      🏍️ {order.courier.courierProfile.vehicleBrand} {order.courier.courierProfile.vehicleColor} — {order.courier.courierProfile.vehiclePlate}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, minHeight: "400px", display: "flex", flexDirection: "column" }}>
                {order.status === "DELIVERED" && order.proofOfDeliveryUrl ? (
                  <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8f9fa" }}>
                    <h4 style={{ marginBottom: "1rem", color: "var(--color-success)" }}>✅ Pesanan Selesai (Telah Diantar)</h4>
                    <p style={{ marginBottom: "1rem", color: "var(--color-muted)" }}>Bukti Pengantaran:</p>
                    <img 
                      src={order.proofOfDeliveryUrl} 
                      alt="Proof of Delivery" 
                      style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", border: "2px solid var(--color-success)", objectFit: "cover" }} 
                      onClick={() => window.open(order.proofOfDeliveryUrl, '_blank')}
                    />
                  </div>
                ) : (
                  <TrackingMap markers={getMapMarkers()} lat={courierLocation?.lat} lng={courierLocation?.lng} />
                )}
              </div>
            </div>

            {/* RIGHT: Live Chat */}
            <div className="card" style={{ padding: "0", display: "flex", flexDirection: "column", height: "600px" }}>
              <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", background: "white" }}>
                <h3 style={{ margin: 0, color: "var(--color-primary)" }}>Chat Penjual / Kurir</h3>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--color-muted)" }}>{order.store.name}</p>
              </div>
              
              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", background: "#f8f9fa", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {messages.length === 0 ? (
                  <div className="text-center text-muted" style={{ padding: "2rem" }}>
                    Kirim pesan pertama Anda.
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user.id;
                    return (
                      <div key={msg.id || idx} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                        <div style={{ 
                          background: isMe ? "var(--color-primary)" : "white", 
                          color: isMe ? "white" : "inherit",
                          padding: "0.875rem 1rem", 
                          borderRadius: "16px",
                          borderBottomRightRadius: isMe ? "4px" : "16px",
                          borderBottomLeftRadius: !isMe ? "4px" : "16px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                          border: isMe ? "none" : "1px solid var(--color-border)"
                        }}>
                          {!isMe && <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--color-primary-dark)", marginBottom: "0.35rem" }}>{msg.sender?.name || "Penjual"}</div>}
                          
                          {msg.photoUrl && (
                            <img src={msg.photoUrl} alt="Attachment" style={{ width: "100%", borderRadius: "0.5rem", marginBottom: "0.5rem", cursor: "pointer", objectFit: "cover", maxHeight: "200px" }} onClick={() => window.open(msg.photoUrl, "_blank")} />
                          )}
                          
                          {msg.content && <div style={{ wordBreak: "break-word", lineHeight: "1.5" }}>{msg.content}</div>}
                          
                          <div style={{ fontSize: "0.65rem", color: isMe ? "rgba(255,255,255,0.8)" : "var(--color-muted)", textAlign: "right", marginTop: "0.4rem" }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: "1rem", borderTop: "1px solid var(--color-border)", background: "white" }}>
                <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem" }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: "none" }} 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    style={{ padding: "0.5rem", borderRadius: "50%" }}
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                  >
                    <ImageIcon size={20} className={uploading ? "animate-pulse" : ""} />
                  </button>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Ketik pesan..." 
                    style={{ flex: 1, borderRadius: "100px" }}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem", borderRadius: "100px" }} disabled={!newMessage.trim() && !uploading}>
                    <Send size={18} />
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
