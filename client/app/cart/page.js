"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Navbar from "../components/Navbar";

/**
 * Halaman Keranjang (Cart) — Pembeli
 * Menampilkan pesanan, pilih metode pengantaran, dan checkout.
 */

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const [deliveryMethod, setDeliveryMethod] = useState("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER_MANUAL");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [distanceKm, setDistanceKm] = useState(0);
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      setCart(parsed);
      if (parsed.length > 0) {
        setStoreInfo({
          id: parsed[0].storeId,
          name: parsed[0].storeName,
        });
        fetchStoreAndCalculate(parsed[0].storeId);
      }
    }
  }, []);

  const fetchStoreAndCalculate = async (id) => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      setUserLoc({ lat: user.latitude, lng: user.longitude });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/stores/${id}`);
      const result = await res.json();
      if (result.success && result.data) {
        const store = result.data;
        if (user.latitude && user.longitude && store.latitude && store.longitude) {
          const R = 6371; 
          const dLat = (store.latitude - user.latitude) * Math.PI / 180;
          const dLon = (store.longitude - user.longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(user.latitude * Math.PI / 180) * Math.cos(store.latitude * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          setDistanceKm(R * c);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateQuantity = (menuId, delta) => {
    const newCart = cart.map(item => {
      if (item.menuId === menuId) {
        let newQty = item.quantity + delta;
        if (delta > 0 && item.dailyStock !== undefined && newQty > item.dailyStock) {
          alert(`Maaf, stok hanya tersisa ${item.dailyStock} porsi.`);
          newQty = item.dailyStock;
        }
        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    if (newCart.length === 0) setStoreInfo(null);
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          storeId: storeInfo.id,
          deliveryMethod,
          paymentMethod,
          notes,
          items: cart.map(item => ({ menuId: item.menuId, quantity: item.quantity }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal checkout");

      localStorage.removeItem("cart"); // Clear cart immediately before redirect
      
      // Redirect ke pesanan
      router.push("/orders");

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let deliveryFee = 0;
  if (deliveryMethod === "SELLER_DELIVERY") {
    deliveryFee = 2000;
    if (distanceKm > 1) deliveryFee += Math.ceil(distanceKm - 1) * 1000;
  }
  if (deliveryMethod === "COURIER") {
    deliveryFee = 5000;
    if (distanceKm > 1) deliveryFee += Math.ceil(distanceKm - 1) * 1500;
  }
  
  const total = subtotal + deliveryFee;

  function formatPrice(price) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
  }

  return (
    <>
      <Navbar />
      <main className="page-content">
        <div className="container" style={{ maxWidth: "800px" }}>
          <div className="explore-header" style={{ marginBottom: "2rem" }}>
            <h1>Keranjang Belanja 🛒</h1>
            <Link href="/explore">← Kembali Jelajahi Menu</Link>
          </div>

          {error && <div className="toast toast-error">{error}</div>}

          {cart.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🗑️</div>
              <p className="empty-state-text">Keranjangmu masih kosong.</p>
              <Link href="/explore" className="btn btn-primary">Mulai Pesan</Link>
            </div>
          ) : (
            <div className="grid grid-2" style={{ gridTemplateColumns: "1fr 350px", gap: "2rem" }}>
              {/* Sisi Kiri: Daftar Menu */}
              <div className="cart-items">
                <div className="card" style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1rem" }}>
                    Pesanan dari: {storeInfo?.name}
                  </h4>
                  
                  {cart.map(item => (
                    <div key={item.menuId} style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px dashed var(--color-border)" }}>
                      <div style={{ width: "60px", height: "60px", background: "var(--color-bg)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", overflow: "hidden" }}>
                        {item.photoUrl ? (
                          <img src={item.photoUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          "🍽️"
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ marginBottom: "0.25rem" }}>{item.name}</h5>
                        <p className="text-primary" style={{ fontWeight: "bold" }}>{formatPrice(item.price)}</p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => updateQuantity(item.menuId, -1)}>-</button>
                        <span style={{ fontWeight: "bold", width: "20px", textAlign: "center" }}>{item.quantity}</span>
                        <button className="btn btn-primary btn-sm" onClick={() => updateQuantity(item.menuId, 1)}>+</button>
                      </div>
                    </div>
                  ))}

                  <div className="form-group" style={{ marginTop: "1rem", marginBottom: 0 }}>
                    <label className="form-label">Catatan untuk penjual (opsional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Contoh: Sambalnya dipisah ya bu..." 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="card">
                  <h4 style={{ marginBottom: "1rem" }}>Metode Pengantaran 🛵</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ display: "flex", gap: "1rem", padding: "1rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: "pointer", background: deliveryMethod === "PICKUP" ? "var(--color-primary-50)" : "white", borderColor: deliveryMethod === "PICKUP" ? "var(--color-primary)" : "var(--color-border)", transition: "all 0.3s ease", transform: deliveryMethod === "PICKUP" ? "scale(1.02)" : "scale(1)", boxShadow: deliveryMethod === "PICKUP" ? "var(--shadow-md)" : "none" }}>
                      <input type="radio" name="delivery" value="PICKUP" checked={deliveryMethod === "PICKUP"} onChange={() => setDeliveryMethod("PICKUP")} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold" }}>Ambil Sendiri</div>
                        <div className="text-xs text-muted">Ambil langsung ke kos penjual (Gratis)</div>
                      </div>
                      <div className="text-primary" style={{ fontWeight: "bold" }}>Rp 0</div>
                    </label>
                    <label style={{ display: "flex", gap: "1rem", padding: "1rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: "pointer", background: deliveryMethod === "SELLER_DELIVERY" ? "var(--color-primary-50)" : "white", borderColor: deliveryMethod === "SELLER_DELIVERY" ? "var(--color-primary)" : "var(--color-border)", transition: "all 0.3s ease", transform: deliveryMethod === "SELLER_DELIVERY" ? "scale(1.02)" : "scale(1)", boxShadow: deliveryMethod === "SELLER_DELIVERY" ? "var(--shadow-md)" : "none" }}>
                      <input type="radio" name="delivery" value="SELLER_DELIVERY" checked={deliveryMethod === "SELLER_DELIVERY"} onChange={() => setDeliveryMethod("SELLER_DELIVERY")} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold" }}>Diantar Penjual</div>
                        <div className="text-xs text-muted">Jarak: {distanceKm ? distanceKm.toFixed(1) : 0} km</div>
                      </div>
                      <div className="text-primary" style={{ fontWeight: "bold" }}>{distanceKm > 1 ? `Rp ${2000 + Math.ceil(distanceKm - 1)*1000}` : "Rp 2.000"}</div>
                    </label>
                    <label style={{ display: "flex", gap: "1rem", padding: "1rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: "pointer", background: deliveryMethod === "COURIER" ? "var(--color-primary-50)" : "white", borderColor: deliveryMethod === "COURIER" ? "var(--color-primary)" : "var(--color-border)", transition: "all 0.3s ease", transform: deliveryMethod === "COURIER" ? "scale(1.02)" : "scale(1)", boxShadow: deliveryMethod === "COURIER" ? "var(--shadow-md)" : "none" }}>
                      <input type="radio" name="delivery" value="COURIER" checked={deliveryMethod === "COURIER"} onChange={() => setDeliveryMethod("COURIER")} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold" }}>Kurir Mitra</div>
                        <div className="text-xs text-muted">Jarak: {distanceKm ? distanceKm.toFixed(1) : 0} km</div>
                      </div>
                      <div className="text-primary" style={{ fontWeight: "bold" }}>{distanceKm > 1 ? `Rp ${5000 + Math.ceil(distanceKm - 1)*1500}` : "Rp 5.000"}</div>
                    </label>
                  </div>
                  
                  {deliveryMethod !== "PICKUP" && distanceKm > 10 && (
                    <div style={{ marginTop: "1rem", color: "#b91c1c", fontSize: "0.875rem", padding: "0.75rem", backgroundColor: "#fee2e2", borderRadius: "8px" }}>
                      ⚠️ Jarak kosmu terlalu jauh ({distanceKm.toFixed(1)} km). Maksimal pesan antar adalah 10 km.
                    </div>
                  )}
                </div>
              </div>

              {/* Sisi Kanan: Ringkasan Pembayaran */}
              <div className="cart-summary">
                <div className="card" style={{ position: "sticky", top: "calc(var(--navbar-height) + 2rem)" }}>
                  <h4 style={{ marginBottom: "1rem" }}>Ringkasan Pembayaran</h4>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span className="text-muted">Total Harga Makanan</span>
                    <span style={{ fontWeight: "bold" }}>{formatPrice(subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--color-border)" }}>
                    <span className="text-muted">Ongkos Kirim</span>
                    <span style={{ fontWeight: "bold" }}>{formatPrice(deliveryFee)}</span>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                    <span style={{ fontSize: "var(--font-size-lg)", fontWeight: "bold" }}>Total Tagihan</span>
                    <span className="text-primary" style={{ fontSize: "var(--font-size-xl)", fontWeight: "800" }}>{formatPrice(total)}</span>
                  </div>

                  <h5 style={{ marginBottom: "0.5rem" }}>Metode Pembayaran</h5>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: "pointer", background: paymentMethod === "TRANSFER_MANUAL" ? "var(--color-primary-50)" : "white" }}>
                      <input type="radio" name="payment" value="TRANSFER_MANUAL" checked={paymentMethod === "TRANSFER_MANUAL"} onChange={() => setPaymentMethod("TRANSFER_MANUAL")} />
                      <span style={{ fontWeight: "500" }}>Transfer Langsung ke Penjual</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", cursor: "pointer", background: paymentMethod === "COD" ? "var(--color-primary-50)" : "white" }}>
                      <input type="radio" name="payment" value="COD" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
                      <span style={{ fontWeight: "500" }}>Bayar Tunai di Tempat (COD)</span>
                    </label>
                  </div>

                  <button className="btn btn-primary btn-block btn-lg" onClick={handleCheckout} disabled={loading || (deliveryMethod !== "PICKUP" && distanceKm > 10)}>
                    {loading ? "Memproses..." : (paymentMethod === "COD" ? "Buat Pesanan (COD)" : "Pesan & Upload Bukti Transfer")}
                  </button>
                  <p className="text-xs text-muted text-center" style={{ marginTop: "1rem" }}>
                    {paymentMethod === "TRANSFER_MANUAL" ? "Kamu akan diarahkan ke pesanan untuk melihat nomor GoPay/DANA penjual dan mengunggah bukti transfer." : "Siapkan uang pas saat menerima pesanan (Makanan + Ongkir)."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
