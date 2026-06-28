"use client";

import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Link from "next/link";
import HeroActions from "./components/HeroActions";
import { Search, Smartphone, CreditCard, Bike, Leaf, MapPin, Wallet, Handshake, Utensils, Drumstick, CupSoda, Package, ChefHat } from "lucide-react";

/**
 * Landing Page KosEats
 * Halaman pertama yang dilihat pengunjung. Harus WOW dan membuat orang langsung ingin pesan.
 * Sections: Hero, Cara Kerja, Keunggulan, Kategori Menu, CTA Penjual, Statistik
 */
export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };
    loadUser();
    window.addEventListener("userUpdated", loadUser);
    return () => window.removeEventListener("userUpdated", loadUser);
  }, []);

  return (
    <>
      <Navbar />
      <main>
        {/* ========== HERO SECTION ========== */}
        <section className="hero">
          <div className="hero-bg-pattern" />
          <div className="container hero-content">
            <div className="hero-text">
              <div className="hero-badge">
                <span className="badge badge-success">🌿 Transparan & Sehat</span>
              </div>
              <h1 className="hero-title">
                Makanan Rumahan
                <br />
                <span className="hero-title-highlight">Langsung ke Kamar</span>
                <br />
                Kos-mu
              </h1>
              <p className="hero-subtitle">
                Pesan masakan ibu-ibu UMKM lokal di sekitar kos-mu. 
                <strong> Murah, dekat, dan tahu kandungan gizinya!</strong>
              </p>
              <HeroActions />
              <div className="hero-stats-mini">
                <div className="hero-stat">
                  <span className="hero-stat-value">500+</span>
                  <span className="hero-stat-label">Menu Tersedia</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">50+</span>
                  <span className="hero-stat-label">Penjual Mitra</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <span className="hero-stat-value">&lt;1km</span>
                  <span className="hero-stat-label">Radius Antar</span>
                </div>
              </div>
            </div>

            {/* Hero Visual - Infinite Marquee */}
            <div className="hero-visual">
              <div className="marquee-container">
                <div className="marquee-track-left-to-right">
                  {/* Track 1 (Left to Right) */}
                  <div className="marquee-food-card" style={{ backgroundImage: "url('/images/nasi-goreng.jpg')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('/images/sayur.jpg')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80')" }}></div>
                  {/* Duplicate for infinite effect */}
                  <div className="marquee-food-card" style={{ backgroundImage: "url('/images/nasi-goreng.jpg')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('/images/sayur.jpg')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80')" }}></div>
                </div>
                
                <div className="marquee-track-right-to-left" style={{ animationDuration: '30s' }}>
                  {/* Track 2 (Right to Left) */}
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80')" }}></div>
                  {/* Duplicate for infinite effect */}
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80')" }}></div>
                </div>

                <div className="marquee-track-left-to-right" style={{ animationDuration: '22s' }}>
                  {/* Track 3 (Left to Right) */}
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?auto=format&fit=crop&w=400&q=80')" }}></div>
                  {/* Duplicate for infinite effect */}
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=400&q=80')" }}></div>
                  <div className="marquee-food-card" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1564834724105-918b73d1b9e0?auto=format&fit=crop&w=400&q=80')" }}></div>
                </div>
                
                <div className="hero-gizi-badge" style={{ position: "absolute", bottom: "1rem", right: "2rem", zIndex: 10 }}>
                  <Leaf size={16} className="text-success" style={{ marginRight: "4px" }} />
                  <span>Info Gizi Tersedia</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== CARA KERJA ========== */}
        <section className="section section-how" id="cara-kerja">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Mudah Banget!</span>
              <h2>Cara Pesan di KosEats</h2>
              <p className="text-muted">Cuma 3 langkah, makanan sudah di depan pintu kamar kos-mu</p>
            </div>
            <div className="grid grid-3 how-grid">
              <div className="how-card">
                <div className="how-step">1</div>
                <div className="how-icon"><Smartphone size={40} className="text-primary" /></div>
                <h4>Pilih Menu</h4>
                <p>Jelajahi masakan rumahan dari penjual di sekitar kos-mu. Filter berdasarkan kategori atau info gizi.</p>
              </div>
              <div className="how-card">
                <div className="how-step">2</div>
                <div className="how-icon"><CreditCard size={40} className="text-primary" /></div>
                <h4>Bayar Online</h4>
                <p>Bayar lewat QRIS, GoPay, OVO, atau Transfer Bank. Aman dan instan via Midtrans.</p>
              </div>
              <div className="how-card">
                <div className="how-step">3</div>
                <div className="how-icon"><Bike size={40} className="text-primary" /></div>
                <h4>Terima Makanan</h4>
                <p>Ambil sendiri (gratis ongkir!) atau diantar langsung. Lacak pesananmu secara real-time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== KEUNGGULAN ========== */}
        <section className="section section-features" id="keunggulan">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Kenapa KosEats?</span>
              <h2>Beda dari yang Lain</h2>
              <p className="text-muted">Bukan cuma marketplace biasa — kami peduli nutrisi dan UMKM lokal</p>
            </div>
            <div className="grid grid-2 features-grid">
              <div className="feature-card feature-gizi">
                <div className="feature-icon-large"><Leaf size={48} className="text-success" /></div>
                <div>
                  <h4>Label Gizi Transparan</h4>
                  <p>Lihat kalori, protein, karbohidrat & lemak sebelum pesan. Tahu apa yang kamu makan!</p>
                  <span className="badge badge-nutrition">✨ Fitur Eksklusif KosEats</span>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon-large"><MapPin size={48} className="text-primary" /></div>
                <div>
                  <h4>Hiperlokal (Radius &lt;1km)</h4>
                  <p>Semua penjual ada di sekitar kos-mu. Makanan sampai dalam hitungan menit, masih hangat!</p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon-large"><Wallet size={48} style={{ color: "#E67E22" }} /></div>
                <div>
                  <h4>Harga Terjangkau</h4>
                  <p>Masakan rumahan mulai dari Rp 5.000. Ongkir murah bahkan gratis untuk ambil sendiri.</p>
                </div>
              </div>
              <div className="feature-card">
                <div className="feature-icon-large"><Handshake size={48} style={{ color: "#3498DB" }} /></div>
                <div>
                  <h4>Dukung UMKM Lokal</h4>
                  <p>Setiap pesanan langsung membantu ibu-ibu dan UMKM di sekitar kos-mu. Komisi hanya 12%.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========== KATEGORI MENU ========== */}
        <section className="section section-categories" id="kategori">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Menu Lengkap</span>
              <h2>Mau Makan Apa Hari Ini?</h2>
            </div>
            <div className="categories-scroll">
              {[
                { img: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=200&q=80", label: "Nasi + Lauk", count: 120 },
                { img: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=200&q=80", label: "Lauk Saja", count: 85 },
                { img: "/images/sayur.jpg", label: "Sayur", count: 60 },
                { img: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=200&q=80", label: "Cemilan", count: 45 },
                { img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=200&q=80", label: "Minuman", count: 55 },
                { img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&q=80", label: "Paket Hemat", count: 30 },
              ].map((cat) => (
                <Link
                  href={`/explore?category=${cat.label}`}
                  className="category-card"
                  key={cat.label}
                >
                  <img src={cat.img} alt={cat.label} className="category-emoji" />
                  <span className="category-label">{cat.label}</span>
                  <span className="category-count">{cat.count} menu</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ========== CTA PENJUAL & KURIR ========== */}
        {(!user || user.role === 'BUYER') && (
          <section className="section section-seller-cta">
            <div className="container" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              
              {/* CTA Penjual */}
              <div className="seller-cta-card">
                <div className="seller-cta-content">
                  <h2>Punya Masakan Andalan?</h2>
                  <p>
                    Gabung jadi mitra KosEats dan jangkau ratusan anak kos di
                    sekitar rumahmu. Pendaftaran gratis, komisi hanya 12%.
                  </p>
                  <Link
                    href="/upgrade/seller"
                    className="btn btn-primary btn-lg"
                    id="cta-seller-register"
                  >
                    <ChefHat size={20} style={{ marginRight: "8px" }} /> Daftar Jadi Penjual
                  </Link>
                </div>
                <div className="seller-cta-visual">
                  <span className="seller-cta-emoji"><ChefHat size={120} strokeWidth={1.5} color="var(--color-primary)" /></span>
                </div>
              </div>

              {/* CTA Kurir */}
              <div className="seller-cta-card" style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)" }}>
                <div className="seller-cta-content">
                  <h2 style={{ color: "white" }}>Punya Motor Nganggur?</h2>
                  <p style={{ color: "rgba(255,255,255,0.9)" }}>
                    Gabung jadi Driver KosEats dan hasilkan uang tambahan di waktu luangmu. Waktu fleksibel, khusus area kampus.
                  </p>
                  <Link
                    href="/upgrade/courier"
                    className="btn btn-lg"
                    style={{ background: "white", color: "#0369a1", fontWeight: "bold" }}
                    id="cta-courier-register"
                  >
                    <Bike size={20} style={{ marginRight: "8px" }} /> Daftar Jadi Driver
                  </Link>
                </div>
                <div className="seller-cta-visual">
                  <span className="seller-cta-emoji"><Bike size={120} strokeWidth={1.5} color="rgba(255,255,255,0.2)" /></span>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ========== TRUST STATS ========== */}
        <section className="section section-trust" id="statistik">
          <div className="container">
            <div className="trust-grid">
              <div className="trust-item">
                <span className="trust-value">1,200+</span>
                <span className="trust-label">Pesanan Selesai</span>
              </div>
              <div className="trust-item">
                <span className="trust-value">4.8 ⭐</span>
                <span className="trust-label">Rating Rata-rata</span>
              </div>
              <div className="trust-item">
                <span className="trust-value">98%</span>
                <span className="trust-label">Pembeli Puas</span>
              </div>
              <div className="trust-item">
                <span className="trust-value">Rp 2K</span>
                <span className="trust-label">Ongkir Termurah</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
