"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Heart } from "lucide-react";

/**
 * Footer KosEats — tampil di halaman publik (landing, explore)
 */
export default function Footer() {
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
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-section">
            <div className="footer-brand" style={{ marginBottom: "1rem" }}>
              <Link href="/" className="navbar-brand">
                <img src="/logo.png" alt="KosEats Logo" className="navbar-logo-image" style={{ width: "48px", height: "48px", mixBlendMode: "multiply" }} />
                <span className="navbar-logo-text">
                  Kos<span className="text-primary">Eats</span>
                </span>
              </Link>
            </div>
            <p className="footer-tagline">
              Gak Pake Ribet, Makanan Enak Langsung Mendarat di Kamar. 
              Marketplace masakan rumahan hiperlokal #1 untuk anak kos.
            </p>
          </div>

          {/* Links */}
          <div className="footer-section">
            <h5 className="footer-title">Navigasi</h5>
            <ul className="footer-links">
              <li><Link href="/">Beranda</Link></li>
              <li><Link href="/explore">Jelajahi Menu</Link></li>
              {!user ? (
                <>
                  <li><Link href="/login">Masuk</Link></li>
                  <li><Link href="/register">Daftar</Link></li>
                </>
              ) : (
                <>
                  <li><Link href="/profile">Profil Saya</Link></li>
                  {user.role === 'SELLER' && <li><Link href="/seller">Dashboard Toko</Link></li>}
                  {user.courierProfile?.status === 'APPROVED' && <li><Link href="/courier">Tugas Kurir</Link></li>}
                </>
              )}
            </ul>
          </div>

          {/* Mitra */}
          {(!user || user.role === 'BUYER' || user.role === 'ADMIN') && (
            <div className="footer-links">
              <h4 className="footer-title">Kemitraan</h4>
              <ul>
                {(!user || user.role === 'BUYER') && (
                  <>
                    <li><Link href="/upgrade/seller" className="footer-link">Daftar Jadi Penjual</Link></li>
                    <li><Link href="/upgrade/courier" className="footer-link">Daftar Jadi Driver</Link></li>
                  </>
                )}
                {user?.role === 'ADMIN' && (
                  <li><Link href="/admin" className="footer-link">Portal Admin</Link></li>
                )}
              </ul>
            </div>
          )}

          {/* Kontak */}
          <div className="footer-section">
            <h5 className="footer-title">Hubungi Kami</h5>
            <ul className="footer-links">
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Mail size={16} className="text-primary" /> arielardiansyah050316@gmail.com</li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><Phone size={16} className="text-primary" /> 082329554753</li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><MapPin size={16} className="text-primary" /> Malang, Jawa Timur</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} KosEats. Semua hak dilindungi.</p>
          <p className="footer-made" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
            Dibuat dengan <Heart size={14} className="text-error" fill="currentColor" /> untuk anak kos & UMKM lokal
          </p>
        </div>
      </div>
    </footer>
  );
}
