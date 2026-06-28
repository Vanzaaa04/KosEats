"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { Flame, Beef, Wheat, Droplet, Info, Search, Leaf } from "lucide-react";

/**
 * Halaman Explore (Jelajahi Menu) — Pembeli
 * Menampilkan semua menu dari toko yang buka
 * Fitur: Filter kategori, Search, Badge Gizi, Diskon, Skeleton Loading
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

const CATEGORIES = [
  { value: "", label: "Semua", img: "/images/nasi-goreng.jpg" },
  { value: "NASI_LAUK", label: "Nasi + Lauk", img: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=200&q=80" },
  { value: "LAUK", label: "Lauk Saja", img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=200&q=80" },
  { value: "SAYUR", label: "Sayur", img: "/images/sayur.jpg" },
  { value: "CEMILAN", label: "Cemilan", img: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=200&q=80" },
  { value: "MINUMAN", label: "Minuman", img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=200&q=80" },
  { value: "PAKET", label: "Paket Hemat", img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&q=80" },
];

// Skeleton Loading Component (Shimmer Effect)
function MenuCardSkeleton() {
  return (
    <div className="menu-card">
      <div className="skeleton skeleton-image" />
      <div className="menu-card-body">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: "40%" }} />
        <div className="skeleton skeleton-text" style={{ width: "30%", marginTop: "0.5rem" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem" }}>
          <div className="skeleton skeleton-text" style={{ width: "25%" }} />
          <div className="skeleton skeleton-text" style={{ width: "20%" }} />
        </div>
      </div>
    </div>
  );
}

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export default function ExplorePage() {
  const router = useRouter();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [showNutritionOnly, setShowNutritionOnly] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedMenu, setSelectedMenu] = useState(null);

  // Load cart dari localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  // Fetch menus dari API
  useEffect(() => {
    fetchMenus();
  }, [activeCategory, showNutritionOnly]);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.append("category", activeCategory);
      if (showNutritionOnly) params.append("hasNutrition", "true");
      if (search) params.append("search", search);

      const res = await fetch(`${API_URL}/menus?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMenus(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch menus:", err);
    } finally {
      setLoading(false);
    }
  };

  // Search handler (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMenus();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Tambah ke keranjang (micro-animation ready)
  const addToCart = (menu) => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      alert("Ups! Anda harus Login atau Daftar dulu untuk memesan makanan.");
      router.push("/login");
      return;
    }

    const existing = cart.find((item) => item.menuId === menu.id);
    
    if (existing && existing.quantity >= menu.dailyStock) {
      alert(`Maaf, stok ${menu.name} hanya tersisa ${menu.dailyStock} porsi.`);
      return;
    }

    if (!existing && menu.dailyStock < 1) {
      alert(`Maaf, stok ${menu.name} sedang habis.`);
      return;
    }

    let newCart;
    if (existing) {
      newCart = cart.map((item) =>
        item.menuId === menu.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCart = [
        ...cart,
        {
          menuId: menu.id,
          name: menu.name,
          price: menu.finalPrice,
          originalPrice: menu.price,
          storeId: menu.storeId,
          storeName: menu.store.name,
          photoUrl: menu.photoUrl,
          dailyStock: menu.dailyStock,
          quantity: 1,
        },
      ];
    }
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <Navbar />
      <main className="page-content">
        <div className="container">
          {/* Header */}
          <div className="explore-header">
            <h1 style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "var(--font-size-4xl)", fontWeight: "var(--font-weight-bold)" }}>
              Jelajahi Menu <Search className="text-primary" size={36} />
            </h1>
            <p className="text-muted">
              Temukan masakan rumahan enak dan murah di sekitar kos-mu
            </p>
          </div>

          {/* Search Bar */}
          <div className="explore-search" id="search-bar">
            <div className="form-input-icon" style={{ maxWidth: "500px" }}>
              <span className="icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="Cari menu favorit... (contoh: Ayam Geprek)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="search-input"
              />
            </div>
            {/* Toggle Filter Gizi */}
            <button
              className={`btn ${showNutritionOnly ? "btn-accent" : "btn-secondary"}`}
              onClick={() => setShowNutritionOnly(!showNutritionOnly)}
              id="filter-nutrition"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <Leaf size={18} className={showNutritionOnly ? "" : "text-success"} /> {showNutritionOnly ? "Info Gizi: ON" : "Filter Gizi"}
            </button>
          </div>

          {/* Category Bar (Sticky) */}
          <div className="explore-categories" id="category-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`category-pill ${
                  activeCategory === cat.value ? "active" : ""
                }`}
                onClick={() => setActiveCategory(cat.value)}
              >
                <img src={cat.img} alt={cat.label} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", marginRight: "4px" }} />
                {cat.label}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className="grid grid-3 explore-grid">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <MenuCardSkeleton key={i} />
                ))
              : menus.length === 0 ? (
                  <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
                    <div className="empty-state-icon">🍽️</div>
                    <p className="empty-state-text">
                      Tidak ada menu ditemukan.
                      {showNutritionOnly && " Coba matikan filter Info Gizi."}
                    </p>
                  </div>
                ) : (
                  menus.map((menu) => (
                    <div 
                      className="menu-card" 
                      key={menu.id} 
                      id={`menu-${menu.id}`}
                      onClick={() => setSelectedMenu(menu)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Image */}
                      <div
                        className="menu-card-image"
                        style={{
                          backgroundImage: menu.photoUrl
                            ? `url(${menu.photoUrl})`
                            : undefined,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "3rem",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {!menu.photoUrl && "🍽️"}
                      </div>

                      {/* Badges overlay */}
                      <div className="menu-card-badges">
                        {menu.hasNutritionInfo && (
                          <span className="badge badge-nutrition">🥦 Info Gizi</span>
                        )}
                        {menu.activeDiscount && (
                          <span className="discount-tag">
                            🏷️ -{formatPrice(menu.activeDiscount.amount)}
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <div className="menu-card-body">
                        <h4 className="menu-card-name">{menu.name}</h4>
                        <p className="menu-card-store">
                          📍 {menu.store.name}
                        </p>

                        {menu.hasNutritionInfo && menu.nutrition && (
                          <div className="text-xs text-muted" style={{ marginBottom: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", background: "var(--color-primary-50)", padding: "0.5rem", borderRadius: "var(--radius-sm)" }}>
                            <span style={{ fontWeight: "bold", color: "var(--color-primary-600)" }}>🔥 {menu.nutrition.calories || 0} kkal</span>
                            <span>🥩 P: {menu.nutrition.proteinG || 0}g</span>
                            <span>🍚 K: {menu.nutrition.carbsG || 0}g</span>
                            <span>🧈 L: {menu.nutrition.fatG || 0}g</span>
                          </div>
                        )}

                        {/* Price */}
                        <div className="menu-card-price">
                          {formatPrice(menu.finalPrice)}
                          {menu.activeDiscount && (
                            <span className="original-price">
                              {formatPrice(menu.price)}
                            </span>
                          )}
                        </div>

                        {/* Footer: Rating + Add to Cart */}
                        <div className="menu-card-footer">
                          <div className="menu-card-rating">
                            ⭐ {menu.storeRating || "-"}
                          </div>
                          {menu.activeDiscount && (
                            <span className="text-xs text-muted">
                              Sisa {menu.activeDiscount.quotaRemaining} porsi diskon
                            </span>
                          )}
                        </div>

                        {/* Add Button */}
                        <button 
                          className="btn btn-primary" 
                          style={{ width: "100%", marginTop: "0.5rem" }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            const target = e.currentTarget;
                            target.style.transform = "scale(0.95)";
                            setTimeout(() => {
                              if (target) target.style.transform = "scale(1)";
                            }, 150);
                            addToCart(menu);
                          }}
                        >
                          + Tambah
                        </button>
                      </div>
                    </div>
                  ))
                )}
          </div>
        </div>

        {/* Modal Detail Menu */}
        {selectedMenu && (
          <div className="modal-overlay" onClick={() => setSelectedMenu(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setSelectedMenu(null)}>
                ✖
              </button>
              
              <div 
                className="modal-image" 
                style={{ 
                  backgroundImage: selectedMenu.photoUrl ? `url(${selectedMenu.photoUrl})` : "none",
                  backgroundColor: "var(--color-border)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "4rem"
                }}
              >
                {!selectedMenu.photoUrl && "🍽️"}
              </div>

              <div className="modal-scroll-area">
                <div className="modal-body">
                  <h2 className="modal-title" style={{ textTransform: "capitalize" }}>{selectedMenu.name}</h2>
                  <div className="modal-store">📍 {selectedMenu.store.name}</div>
                  
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--color-primary-600)", marginBottom: "1rem" }}>
                    {formatPrice(selectedMenu.finalPrice)}
                    {selectedMenu.activeDiscount && (
                      <span style={{ textDecoration: "line-through", color: "var(--color-text-muted)", fontSize: "1rem", marginLeft: "0.75rem", fontWeight: "normal" }}>
                        {formatPrice(selectedMenu.price)}
                      </span>
                    )}
                  </div>

                  {selectedMenu.description && (
                    <p className="modal-desc" style={{ color: "var(--color-text-muted)" }}>{selectedMenu.description}</p>
                  )}

                  {selectedMenu.hasNutritionInfo && selectedMenu.nutrition && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <div className="modal-nutrition-title" style={{ fontSize: "1rem" }}><Info size={18} className="text-primary" /> Informasi Gizi</div>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                        <div style={{ flex: 1, backgroundColor: "var(--color-bg)", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", padding: "0.75rem 0.25rem", borderRadius: "var(--radius-md)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ marginBottom: "0.25rem", color: "#f97316" }}><Flame size={20} /></div>
                          <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>{selectedMenu.nutrition.calories || 0}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Kalori</div>
                        </div>
                        <div style={{ flex: 1, backgroundColor: "var(--color-bg)", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", padding: "0.75rem 0.25rem", borderRadius: "var(--radius-md)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ marginBottom: "0.25rem", color: "#ef4444" }}><Beef size={20} /></div>
                          <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>{selectedMenu.nutrition.proteinG || 0}g</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Protein</div>
                        </div>
                        <div style={{ flex: 1, backgroundColor: "var(--color-bg)", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", padding: "0.75rem 0.25rem", borderRadius: "var(--radius-md)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ marginBottom: "0.25rem", color: "#eab308" }}><Wheat size={20} /></div>
                          <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>{selectedMenu.nutrition.carbsG || 0}g</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Karbo</div>
                        </div>
                        <div style={{ flex: 1, backgroundColor: "var(--color-bg)", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", padding: "0.75rem 0.25rem", borderRadius: "var(--radius-md)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ marginBottom: "0.25rem", color: "#facc15" }}><Droplet size={20} /></div>
                          <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>{selectedMenu.nutrition.fatG || 0}g</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>Lemak</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="btn btn-primary" 
                  style={{ width: "100%", padding: "1rem" }}
                  onClick={() => {
                    addToCart(selectedMenu);
                    setSelectedMenu(null);
                  }}
                >
                  + Tambah ke Keranjang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Cart (Sticky Bottom) */}
        {cartCount > 0 && (
          <Link href="/cart" className="floating-cart" id="floating-cart">
            <div className="floating-cart-content">
              <div className="floating-cart-left">
                <span className="floating-cart-count">{cartCount} item</span>
              </div>
              <span className="floating-cart-label">Lihat Keranjang</span>
              <span className="floating-cart-total">
                {formatPrice(cartTotal)}
              </span>
            </div>
          </Link>
        )}
      </main>
    </>
  );
}
