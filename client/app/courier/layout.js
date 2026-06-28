"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { Search, ClipboardList, Wallet, Scale } from "lucide-react";

export default function CourierLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [courierStatus, setCourierStatus] = useState("PENDING");
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkUser = () => {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      if (!token || !user.courierProfile) {
        router.push("/login");
      } else {
        if (user.courierProfile) {
          setCourierStatus(user.courierProfile.status);
          setIsOnline(user.courierProfile.isOnline);
        }
      }
    };
    
    checkUser();
    
    // Setup listener if `isOnline` toggled via Navbar
    window.addEventListener("userUpdated", checkUser);
    return () => window.removeEventListener("userUpdated", checkUser);
  }, [router]);

  return (
    <>
      <Navbar />
      
      {/* Sidebar Kurir */}
      <aside className="sidebar">
        <div className="sidebar-section">Tugas Kurir</div>
        <Link href="/courier" className={`sidebar-link ${pathname === "/courier" ? "active" : ""}`}>
          <Search size={20} className="sidebar-icon" /> Radar Pesanan
        </Link>
        <Link href="/courier/orders" className={`sidebar-link ${pathname === "/courier/orders" ? "active" : ""}`}>
          <ClipboardList size={20} className="sidebar-icon" /> Riwayat Trip
        </Link>
        <Link href="/courier/finance" className={`sidebar-link ${pathname === "/courier/finance" ? "active" : ""}`}>
          <Wallet size={20} className="sidebar-icon" /> Dompet & Komisi
        </Link>
        <Link href="/courier/appeals" className={`sidebar-link ${pathname === "/courier/appeals" ? "active" : ""}`}>
          <Scale size={20} className="sidebar-icon" /> Banding/Kendala
        </Link>
        
        <hr style={{ margin: "1rem 0", borderTop: "1px solid var(--color-border)" }} />
        
        <div style={{ padding: "0 var(--space-6)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--color-muted)", marginBottom: "0.5rem" }}>
            Status Saat Ini:
          </p>
          {isOnline ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-primary)", fontWeight: "bold", background: "var(--color-primary-light)", padding: "0.5rem", borderRadius: "8px" }}>
              <span className="pulse-dot" style={{ width: "10px", height: "10px", backgroundColor: "var(--color-primary)", borderRadius: "50%", display: "inline-block" }}></span>
              SIAP BERTUGAS
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-muted)", fontWeight: "bold", background: "var(--color-bg)", border: "1px solid var(--color-border)", padding: "0.5rem", borderRadius: "8px" }}>
              <span style={{ width: "10px", height: "10px", backgroundColor: "var(--color-muted)", borderRadius: "50%", display: "inline-block" }}></span>
              MODE SANTUY (OFF)
            </div>
          )}
        </div>
      </aside>

      <main className="main-with-sidebar">
        {courierStatus === "PENDING" ? (
          <div className="card text-center" style={{ marginTop: "4rem" }}>
            <h2>⏳ Menunggu Persetujuan Admin</h2>
            <p className="text-muted" style={{ marginTop: "1rem" }}>Akun driver Anda sedang ditinjau oleh tim Admin KosEats. Harap tunggu hingga Admin menyetujui pendaftaran Anda.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );
}
