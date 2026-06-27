"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import dynamic from "next/dynamic";
import io from "socket.io-client";
import { Send, Image as ImageIcon, MapPin, ArrowLeft } from "lucide-react";

const TrackingMap = dynamic(() => import("../../components/Map"), { ssr: false });

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

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
  const [courierLocation, setCourierLocation] = useState({ lat: -7.280, lng: 112.795 });
  const socketRef = useRef(null);
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

    // Connect to Socket
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit("join_order", orderId);

    // Listen for incoming messages
    socketRef.current.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
    });

    // Listen for location updates
    socketRef.current.on("update_location", (loc) => {
      setCourierLocation({ lat: loc.lat, lng: loc.lng });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [user, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const found = data.data.find(o => o.id === orderId);
        if (found) setOrder(found);
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

    // Send via socket
    if (socketRef.current) {
      socketRef.current.emit("send_message", optimisticMsg);
    }

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
        const fullUrl = `${API_URL.replace("/api", "")}${data.url}`;
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
              <div style={{ flex: 1, minHeight: "400px" }}>
                <TrackingMap lat={courierLocation.lat} lng={courierLocation.lng} />
              </div>
            </div>

            {/* RIGHT: Live Chat */}
            <div className="card" style={{ padding: "0", display: "flex", flexDirection: "column", height: "600px" }}>
              <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--color-border)", background: "var(--color-primary)", color: "white" }}>
                <h3 style={{ margin: 0, color: "white" }}>Chat Penjual / Kurir</h3>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", opacity: 0.9 }}>{order.store.name}</p>
              </div>
              
              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", background: "#efeae2", display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                          background: isMe ? "#dcf8c6" : "white", 
                          padding: "0.75rem 1rem", 
                          borderRadius: "1rem",
                          borderTopRightRadius: isMe ? "0" : "1rem",
                          borderTopLeftRadius: !isMe ? "0" : "1rem",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                        }}>
                          {!isMe && <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: "var(--color-primary)", marginBottom: "0.25rem" }}>{msg.sender?.name || "Penjual"}</div>}
                          
                          {msg.photoUrl && (
                            <img src={msg.photoUrl} alt="Attachment" style={{ width: "100%", borderRadius: "0.5rem", marginBottom: "0.5rem", cursor: "pointer" }} onClick={() => window.open(msg.photoUrl, "_blank")} />
                          )}
                          
                          {msg.content && <div style={{ wordBreak: "break-word" }}>{msg.content}</div>}
                          
                          <div style={{ fontSize: "0.65rem", color: "gray", textAlign: "right", marginTop: "0.25rem" }}>
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
