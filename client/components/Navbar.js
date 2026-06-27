'use client';
import Link from 'next/link';
import { Bell, ShoppingCart, User, Search, MapPin } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="container flex-between" style={{ width: '100%' }}>
        {/* Logo Section */}
        <Link href="/" className="navbar-brand">
          {/* Logo Placeholder: User will provide logo later, for now a circle */}
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            KE
          </div>
          Kos<span>Eats</span>
        </Link>

        {/* Search Bar - Desktop */}
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 var(--space-6)' }} className="hide-mobile">
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-text-muted)' }} size={20} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Cari Nasi Ayam, Penyet..." 
              style={{ paddingLeft: '40px', borderRadius: 'var(--radius-full)' }} 
            />
          </div>
        </div>

        {/* Location - Desktop */}
        <div className="flex-center hide-mobile" style={{ gap: 'var(--space-2)', color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
          <MapPin size={16} color="var(--color-primary)" />
          <span>Kirim ke: <strong>Kos Tirto Taruno...</strong></span>
        </div>

        {/* Right Navigation */}
        <ul className="navbar-nav">
          <li>
            <Link href="/cart" className="navbar-link flex-center" style={{ gap: 'var(--space-1)' }}>
              <div className="notif-bell">
                <ShoppingCart size={24} />
                <span className="notif-badge">2</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/notifications" className="navbar-link flex-center">
              <div className="notif-bell">
                <Bell size={24} />
                <span className="notif-badge" style={{ backgroundColor: 'var(--color-warning)' }}>5</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/login" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
              <User size={16} /> Masuk
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
