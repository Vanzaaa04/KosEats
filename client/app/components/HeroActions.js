"use client";
import Link from "next/link";
import { Search, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";

export default function HeroActions() {
  const [user, setUser] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoaded(true);
  }, []);

  return (
    <div className="hero-actions">
      {user?.role === 'ADMIN' ? (
        <Link href="/admin" className="btn btn-primary btn-lg">
          Dashboard Admin
        </Link>
      ) : (
        <Link href="/explore" className="btn btn-primary btn-lg" id="hero-cta-explore">
          <Search size={20} style={{ marginRight: "8px" }} /> Jelajahi Menu
        </Link>
      )}
      
      {/* Hide secondary button until we know auth state to prevent flash */}
      {!isLoaded ? (
        <div style={{ width: "180px", height: "48px", borderRadius: "100px", background: "rgba(0,0,0,0.05)" }} className="animate-pulse"></div>
      ) : !user ? (
        <Link href="/register" className="btn btn-outline btn-lg" id="hero-cta-register">
          Daftar Sekarang
        </Link>
      ) : user.role === 'ADMIN' ? (
        <Link href="/admin/users" className="btn btn-outline btn-lg">
          Kelola Pengguna
        </Link>
      ) : user.role === 'SELLER' ? (
        <Link href="/seller/orders" className="btn btn-outline btn-lg">
          <ClipboardList size={20} style={{ marginRight: "8px" }} /> Pesanan Masuk
        </Link>
      ) : user.role === 'COURIER' ? (
        <Link href="/courier/orders" className="btn btn-outline btn-lg">
          <ClipboardList size={20} style={{ marginRight: "8px" }} /> Tugas Antaran
        </Link>
      ) : (
        <Link href="/orders" className="btn btn-outline btn-lg" id="hero-cta-orders">
          <ClipboardList size={20} style={{ marginRight: "8px" }} /> Pesanan Saya
        </Link>
      )}
    </div>
  );
}
