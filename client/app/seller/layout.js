"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { LayoutDashboard, Bell, ChefHat, Wallet, Scale, ArrowLeftRight, Store, Settings } from "lucide-react";

export default function SellerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [storeStatus, setStoreStatus] = useState("PENDING");
  const [storeOpen, setStoreOpen] = useState(false);

  useEffect(() => {
    // Cek role & status dari localstorage
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "SELLER") {
      router.push("/login");
    } else {
      if (user.store) {
        setStoreStatus(user.store.status);
        setStoreOpen(user.store.isOpen);
      }
    }
  }, []);

  return (
    <>
      <Navbar />
      
      {/* Sidebar Seller */}
      <aside className="sidebar">
        <div className="sidebar-section">Toko Saya</div>
        <Link href="/seller" className={`sidebar-link ${pathname === "/seller" ? "active" : ""}`}>
          <LayoutDashboard size={20} className="sidebar-icon" /> Dashboard
        </Link>
        <Link href="/seller/orders" className={`sidebar-link ${pathname === "/seller/orders" ? "active" : ""}`}>
          <Bell size={20} className="sidebar-icon" /> Pesanan Masuk
        </Link>
        <Link href="/seller/menu" className={`sidebar-link ${pathname === "/seller/menu" ? "active" : ""}`}>
          <ChefHat size={20} className="sidebar-icon" /> Kelola Menu
        </Link>
        <Link href="/seller/finance" className={`sidebar-link ${pathname === "/seller/finance" ? "active" : ""}`}>
          <Wallet size={20} className="sidebar-icon" /> Saldo & Komisi
        </Link>
        <Link href="/seller/appeals" className={`sidebar-link ${pathname === "/seller/appeals" ? "active" : ""}`}>
          <Scale size={20} className="sidebar-icon" /> Banding/Refund
        </Link>
        <Link href="/seller/settings" className={`sidebar-link ${pathname === "/seller/settings" ? "active" : ""}`}>
          <Settings size={20} className="sidebar-icon" /> Pengaturan Toko
        </Link>
        <hr style={{ margin: "1rem 0", borderTop: "1px solid var(--color-border)" }} />
        {/* Toggle Buka Tutup Warung */}
        <div style={{ marginTop: "2rem", padding: "0 var(--space-6)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: "bold" }}>Status Warung:</span>
            <button 
              className={`btn ${storeOpen ? "btn-success" : "btn-secondary"}`}
              onClick={async () => {
                const newState = !storeOpen;
                // Update local state optimistically
                setStoreOpen(newState);
                try {
                  const token = localStorage.getItem("token");
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/stores/my`, {
                    method: "PUT",
                    headers: { 
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}` 
                    },
                    body: JSON.stringify({ isOpen: newState })
                  });
                  // Update local storage user data
                  const user = JSON.parse(localStorage.getItem("user") || "{}");
                  if (user.store) {
                    user.store.isOpen = newState;
                    localStorage.setItem("user", JSON.stringify(user));
                  }
                } catch (err) {
                  // Revert if error
                  setStoreOpen(!newState);
                  console.error(err);
                }
              }}
            >
              {storeOpen ? (
                <><Store size={18} style={{ marginRight: "4px" }} /> BUKA (Terima Order)</>
              ) : (
                <><Store size={18} style={{ marginRight: "4px" }} /> TUTUP</>
              )}
            </button>
          </label>
        </div>
      </aside>

      <main className="main-with-sidebar">
        {storeStatus === "PENDING" ? (
          <div className="card text-center" style={{ marginTop: "4rem" }}>
            <h2>⏳ Menunggu Persetujuan Admin</h2>
            <p className="text-muted" style={{ marginTop: "1rem" }}>Akun toko Anda (Ibu Kos) sedang ditinjau oleh tim Admin KosEats. Harap tunggu hingga Admin menyetujui pendaftaran e-KYC Anda.</p>
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );
}
