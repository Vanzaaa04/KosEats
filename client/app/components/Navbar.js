"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Heart, Bell, User, MapPin, Smartphone, Shield, ChefHat, Hand, Home, Search, ClipboardList, Lock, Wallet, Star, Bike } from "lucide-react";
import { io } from "socket.io-client";

/**
 * Navbar KosEats — Komponen navbar utama
 * Muncul di semua halaman pembeli (landing, explore, cart, orders, profile)
 * Berisi: Logo placeholder, navigasi, lonceng notif, avatar profil
 */
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUser(JSON.parse(storedUser));
    };
    loadUser();
    window.addEventListener("userUpdated", loadUser);
    return () => window.removeEventListener("userUpdated", loadUser);
  }, []);

  // Redirect Logic for Courier
  useEffect(() => {
    if (user?.role === 'COURIER') {
      const isOnline = user.courierProfile?.isOnline;
      if (isOnline) {
        // Force to courier pages if online
        if (!pathname.startsWith('/courier') && pathname !== '/profile') {
          router.replace('/courier');
        }
      } else {
        // Force out of courier pages if offline
        if (pathname.startsWith('/courier')) {
          router.replace('/');
        }
      }
    }
  }, [user, pathname, router]);

  // Detect scroll untuk efek shadow pada navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Tutup dropdown notif jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch real notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/notifications`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data.notifications);
          setUnreadCount(data.data.unreadCount);
        }
      } catch (err) {
        console.error("Notif error", err);
      }
    };
    fetchNotifs();
    // Poll every 30s as a fallback to websocket
    const interval = setInterval(fetchNotifs, 30000);
    
    // Socket.io for new review notification
    let socket;
    const token = localStorage.getItem("token");
    if (token) {
      // Kita asumsikan userId ada di payload (bisa juga listen secara generic, tapi lebih baik server emit ke room user)
      // karena kita perlu id, kita init socket setelah kita dapat `user` dari state, tapi hook ini independen.
    }
    return () => clearInterval(interval);
  }, []);

  // Socket Listener for new reviews
  useEffect(() => {
    if (!user) return;
    const socket = io("http://localhost:5000");
    
    // Join room for this user to receive specific notifications
    socket.emit("join", user.id); // Sesuai dengan socket.on('join') di index.js backend
    
    socket.on("new_review", (data) => {
      alert(`🔔 Ulasan Baru ⭐ ${data.rating}/5\nDari ${data.buyerName}: "${data.comment || 'Tanpa komentar'}"`);
      // Update unread count manually to reflect new notif
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const markAllRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/notifications/read-all`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {}
  };

  let navLinks = [];
  if (user?.role === 'SELLER') {
    navLinks = [
      { href: "/seller", label: "Dashboard Penjual", icon: <ChefHat size={20} /> },
      { href: "/seller/orders", label: "Pesanan Masuk", icon: <ClipboardList size={20} /> },
    ];
  } else if (user?.role === 'ADMIN') {
    navLinks = [
      { href: "/admin", label: "Dashboard Admin", icon: <Home size={20} /> },
      { href: "/admin/stores", label: "Approval Toko", icon: <ClipboardList size={20} /> },
      { href: "/admin/couriers", label: "Approval Kurir", icon: <Bike size={20} /> },
      { href: "/admin/appeals", label: "Sengketa", icon: <Search size={20} /> },
    ];
  } else if (user?.role === 'COURIER') {
    if (user.courierProfile?.isOnline) {
      // navLinks dikosongkan karena kurir akan menggunakan sidebar kiri di /courier
      navLinks = [];
    } else {
      navLinks = [
        { href: "/", label: "Beranda", icon: <Home size={20} /> },
        { href: "/explore", label: "Jelajahi", icon: <Search size={20} /> },
        { href: "/orders", label: "Pesanan", icon: <ClipboardList size={20} /> },
      ];
    }
  } else if (user?.role === 'BUYER') {
    navLinks = [
      { href: "/", label: "Beranda", icon: <Home size={20} /> },
      { href: "/explore", label: "Jelajahi", icon: <Search size={20} /> },
      { href: "/orders", label: "Pesanan", icon: <ClipboardList size={20} /> },
    ];
  } else {
    navLinks = [
      { href: "/", label: "Beranda", icon: <Home size={20} /> },
      { href: "/explore", label: "Jelajahi", icon: <Search size={20} /> },
    ];
  }

  return (
    <nav className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}>
      {/* Logo */}
      <Link href="/" className="navbar-brand">
        <img src="/logo.png" alt="KosEats Logo" className="navbar-logo-image" style={{ mixBlendMode: "multiply" }} />
        <span className="navbar-logo-text">
          Kos<span className="text-primary">Eats</span>
        </span>
      </Link>

      {/* Navigasi Desktop */}
      <ul className="navbar-nav desktop-nav">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`navbar-link ${
                pathname === link.href ? "active" : ""
              }`}
              id={`nav-${link.label.toLowerCase().replace(" ", "-")}`}
              style={{ fontWeight: "600", color: pathname === link.href ? "var(--color-primary)" : "#334155", letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              {link.label}
              {link.badge && (
                <span style={{ backgroundColor: "var(--color-warning)", color: "#fff", fontSize: "0.7rem", padding: "2px 6px", borderRadius: "10px", marginLeft: "4px" }}>
                  {link.badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* Actions: Notif + Profile */}
      <div className="navbar-actions">
        {user?.role === 'COURIER' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem', background: 'var(--color-bg)', padding: '4px 12px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: user.courierProfile?.isOnline ? 'var(--color-primary)' : '#64748b' }}>
              {user.courierProfile?.isOnline ? '🛵 Mode Driver' : '🛒 Mode Pelanggan'}
            </span>
            <label style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', margin: 0 }}>
              <input 
                type="checkbox" 
                checked={user.courierProfile?.isOnline || false} 
                style={{ opacity: 0, width: 0, height: 0 }} 
                onChange={async (e) => {
                  const newStatus = e.target.checked;
                  // Optimistic UI
                  const updatedUser = { ...user, courierProfile: { ...user.courierProfile, isOnline: newStatus } };
                  setUser(updatedUser);
                  
                  const token = localStorage.getItem("token");
                  if (token) {
                    try {
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/courier/status`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify({ isOnline: newStatus })
                      });
                      
                      // Update storage & dispatch only after DB successfully updates
                      localStorage.setItem("user", JSON.stringify(updatedUser));
                      window.dispatchEvent(new Event("userUpdated"));
                    } catch (error) {
                      console.error("Failed to update status", error);
                      // Revert UI on failure
                      setUser(user);
                    }
                  }
                }} 
              />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: user.courierProfile?.isOnline ? 'var(--color-primary)' : '#cbd5e1', transition: '.4s', borderRadius: '20px' }}>
                 <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: user.courierProfile?.isOnline ? '18px' : '2px', bottom: '2px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
              </span>
            </label>
          </div>
        )}
        {user ? (
          <>
            {/* Wishlist atau Finance */}
            {user.role === 'SELLER' ? (
          <Link href="/seller/finance" className="navbar-action-btn" aria-label="Keuangan" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={24} color="#10b981" />
          </Link>
        ) : user?.role === 'ADMIN' ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
             <span className="admin-badge-glow" style={{ fontSize: "12px", background: "var(--color-primary)", color: "white", padding: "6px 12px", borderRadius: "16px", fontWeight: "bold", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "0.25rem" }}><Shield size={14} /> ADMIN</span>
          </div>
        ) : (
          <Link href="/favorites" className="navbar-action-btn" aria-label="Wishlist" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Heart size={24} className="text-error" />
          </Link>
        )}

        {/* Lonceng Notifikasi */}
        <div className="notif-bell" ref={notifRef} id="notif-bell">
          <button
            className="notif-bell-btn"
            onClick={() => {
              if (!notifOpen && unreadCount > 0) {
                markAllRead();
              }
              setNotifOpen(!notifOpen);
            }}
            aria-label="Notifikasi"
          >
            <span className={unreadCount > 0 ? "bell-ringing" : ""} style={{ display: "flex" }}><Bell size={24} className="text-primary" /></span>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount}</span>
            )}
          </button>

          {/* Dropdown Notifikasi */}
          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <h4>Notifikasi</h4>
              </div>
              <div className="notif-dropdown-list">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted" style={{ padding: "1rem", textAlign: "center" }}>Belum ada notifikasi.</p>
                ) : notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notif-item ${notif.isRead ? "" : "unread"}`}
                  >
                    <div className="notif-item-content">
                      <p className="notif-item-title">{notif.title}</p>
                      <p className="notif-item-message">{notif.message}</p>
                      <span className="notif-item-time">{new Date(notif.createdAt).toLocaleString("id-ID")}</span>
                    </div>
                    {!notif.isRead && <span className="notif-dot" />}
                  </div>
                ))}
              </div>
              <Link href="/notifications" className="notif-dropdown-footer">
                Lihat semua notifikasi →
              </Link>
            </div>
          )}
        </div>

        {/* Avatar Profil */}
        <div className="navbar-avatar-container" style={{ position: "relative" }}>
          <Link href="/profile" className="navbar-avatar" id="navbar-avatar">
            <div className="avatar-circle" style={user?.photoUrl ? { backgroundImage: `url(${user.photoUrl.startsWith('http') ? user.photoUrl : 'http://localhost:5000' + user.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid var(--color-primary)' } : { border: '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!user?.photoUrl && <User size={24} color="white" />}
            </div>
          </Link>
          {/* Hover Dropdown HD Upgrade */}
          {user && (
            <div className="avatar-dropdown">
              {/* Banner / Cover Photo Area */}
              <div className="avatar-dropdown-banner">
                <div 
                  className="avatar-dropdown-photo" 
                  style={{ backgroundImage: user.photoUrl ? `url(${user.photoUrl.startsWith('http') ? user.photoUrl : 'http://localhost:5000' + user.photoUrl})` : "none", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {!user.photoUrl && <User size={48} color="white" />}
                </div>
              </div>
              
              <div className="avatar-dropdown-body">
                <h3>{user.name}</h3>
                <p className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center', marginBottom: '0.5rem' }}><Smartphone size={14} /> {user.phone || "No HP Belum Diatur"}</p>
                
                <div className="avatar-dropdown-role">
                  <span className={`badge ${user.role === 'SELLER' ? 'badge-warning' : 'badge-primary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    {user.role === 'SELLER' ? <><ChefHat size={14} /> Mitra Penjual</> : user.role === 'ADMIN' ? <><Shield size={14} /> Admin</> : <><Hand size={14} /> Pembeli</>}
                  </span>
                </div>

                {user.role === 'SELLER' && user.store && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: 'var(--color-warning)', fontWeight: 'bold' }}>
                    <Star size={16} fill="currentColor" /> Rating Toko: {user.store.avgRating || 0}
                  </div>
                )}
                {user.role === 'COURIER' && user.courierProfile && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <div style={{ color: 'var(--color-warning)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Star size={16} fill="currentColor" /> Rating Kurir: {user.courierProfile.avgRating || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', color: '#475569' }}>
                      {user.courierProfile.vehiclePlate} • {user.courierProfile.vehicleBrand}
                    </div>
                  </div>
                )}
                
                <div className="avatar-dropdown-address">
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={16} /> Alamat Pengiriman:</strong>
                  <p>{user.address || "Belum diatur, segera atur di profil Anda."}</p>
                </div>
              </div>
            </div>
          )}
        </div>
          </>
        ) : (
          <div className="navbar-auth-buttons" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href="/login" className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Masuk</Link>
            <Link href="/register" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Daftar</Link>
          </div>
        )}

        {/* Hamburger Menu (Mobile) */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <span className={`hamburger ${mobileMenuOpen ? "open" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-menu-link ${
                  pathname === link.href ? "active" : ""
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
            <hr />
            {user && (
              <Link
                href="/profile"
                className="mobile-menu-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span style={{ display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}><User size={20} /></span> Profil Saya
              </Link>
            )}
            {!user && (
              <Link
                href="/login"
                className="mobile-menu-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span style={{ display: 'flex', alignItems: 'center', marginRight: '0.5rem' }}><Lock size={20} /></span> Masuk / Daftar
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
