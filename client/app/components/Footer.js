import Link from "next/link";
import { Mail, Phone, MapPin, Heart } from "lucide-react";

/**
 * Footer KosEats — tampil di halaman publik (landing, explore)
 */
export default function Footer() {
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
              <li><Link href="/login">Masuk</Link></li>
              <li><Link href="/register">Daftar</Link></li>
            </ul>
          </div>

          {/* Mitra */}
          <div className="footer-section">
            <h5 className="footer-title">Mitra KosEats</h5>
            <ul className="footer-links">
              <li><Link href="/register?role=seller">Daftar Jadi Penjual</Link></li>
              <li><Link href="/seller">Dashboard Penjual</Link></li>
            </ul>
          </div>

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
