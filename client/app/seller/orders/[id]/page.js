"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from '../../../lib/supabaseClient';
import { Send, Image as ImageIcon, MapPin, ArrowLeft, AlertTriangle } from "lucide-react";

const TrackingMap = dynamic(() => import("../../../components/Map"), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;
// SOCKET_URL removed

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
    if (order && channelRef.current && ['SELLER_DELIVERY', 'COURIER'].includes(order.deliveryMethod) && ['DELIVERING', 'WAITING_COURIER'].includes(order.status)) {
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
      const res = await fetch(`${API_URL}/orders/store`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const found = data.data.find(o => o.id === orderId);
        if (found) {
          setOrder(found);
          if (!courierLocation) {
            setCourierLocation({ lat: found.buyer?.latitude || -7.280, lng: found.buyer?.longitude || 112.795 });
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeover = async (action) => {
    if (!window.confirm(action === 'SELLER_DELIVERY' ? "Anda yakin ingin MENGANTAR SENDIRI pesanan ini?" : "Anda yakin ingin meminta pembeli PICK-UP pesanan ini?")) return;
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
        alert(data.message);
        fetchOrderDetails();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
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
      // Seller sends to buyer
      receiverId: order?.buyerId || 0, 
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

    // No need to send via socket, DB insert will trigger postgres_changes for receiver

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

  const getMapMarkers = () => {
    if (!order) return [];
    const markers = [];
    if (order.store?.latitude && order.store?.longitude) {
      markers.push({ lat: order.store.latitude, lng: order.store.longitude, type: "STORE", label: "Lokasi Anda" });
    }
    if (order.buyer?.latitude && order.buyer?.longitude) {
      markers.push({ lat: order.buyer.latitude, lng: order.buyer.longitude, type: "BUYER", label: "Lokasi Pengantaran" });
    }
    if (courierLocation && order.status === "ON_THE_WAY") {
      markers.push({ lat: courierLocation.lat, lng: courierLocation.lng, type: "COURIER", label: "Kurir KosEats" });
    }
    return markers;
  };

  if (loading) {
    return (
      <>
        <div className="flex-center" style={{ minHeight: "60vh" }}>
          <div className="spinner" />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
          <h2>Pesanan tidak ditemukan</h2>
          <Link href="/orders" className="btn btn-primary" style={{ marginTop: "1rem" }}>Kembali</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <main className="page-content" style={{ background: "transparent", minHeight: "100vh" }}>
        <div className="container" style={{ maxWidth: "1000px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <Link href="/seller/orders" className="btn btn-outline" style={{ padding: "0.5rem" }}>
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

              {order.status === 'WAITING_COURIER' && (
                <div style={{ padding: "1.5rem", background: "var(--color-warning-light)", borderBottom: "2px solid var(--color-warning)" }}>
                  <h4 style={{ color: "#b26f00", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <AlertTriangle size={20} /> Darurat: Kurir Belum Ditemukan!
                  </h4>
                  <p style={{ color: "#8a5600", marginBottom: "1rem", fontSize: "0.95rem" }}>
                    Pesanan ini berisiko batal jika kurir penuh. Ambil alih pesanan ini agar makanan tidak telantar!
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleTakeover('SELLER_DELIVERY')} className="btn btn-primary" style={{ flex: 1, padding: "0.5rem", fontSize: "0.9rem" }}>
                      🚗 Antar Sendiri (Dapat Ongkir)
                    </button>
                    <button onClick={() => handleTakeover('PICKUP')} className="btn btn-outline" style={{ flex: 1, padding: "0.5rem", fontSize: "0.9rem", background: "white" }}>
                      🛍️ Minta Pick-Up
                    </button>
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
                      style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", border: "2px solid var(--color-success)", objectFit: "cover", cursor: "pointer" }} 
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
                <h3 style={{ margin: 0, color: "var(--color-primary)" }}>Chat Pembeli</h3>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--color-muted)" }}>{order.buyer?.name || "Pembeli"}</p>
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
                          {!isMe && <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--color-primary-dark)", marginBottom: "0.35rem" }}>{msg.sender?.name || "Pembeli"}</div>}
                          
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
