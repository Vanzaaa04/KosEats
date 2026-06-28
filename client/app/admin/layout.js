"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { LayoutDashboard, Store, Scale, Gift, Users, Bike } from "lucide-react";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    
    if (!token || user.role !== "ADMIN") {
      router.push("/login");
    }
  }, []);

  return (
    <>
      <Navbar />
      
      {/* Sidebar Admin */}
      <aside className="sidebar">
        <div className="sidebar-section">Admin Panel</div>
        <Link href="/admin" className={`sidebar-link ${pathname === "/admin" ? "active" : ""}`}>
          <LayoutDashboard size={20} className="sidebar-icon" /> Dashboard Analitik
        </Link>
        <Link href="/admin/stores" className={`sidebar-link ${pathname === "/admin/stores" ? "active" : ""}`}>
          <Store size={20} className="sidebar-icon" /> Approval Toko
        </Link>
        <Link href="/admin/couriers" className={`sidebar-link ${pathname === "/admin/couriers" ? "active" : ""}`}>
          <Bike size={20} className="sidebar-icon" /> Approval Kurir
        </Link>
        <Link href="/admin/appeals" className={`sidebar-link ${pathname === "/admin/appeals" ? "active" : ""}`}>
          <Scale size={20} className="sidebar-icon" /> Sengketa (Banding)
        </Link>
        <Link href="/admin/discounts" className={`sidebar-link ${pathname === "/admin/discounts" ? "active" : ""}`}>
          <Gift size={20} className="sidebar-icon" /> Diskon Platform
        </Link>
        <Link href="/admin/users" className={`sidebar-link ${pathname === "/admin/users" ? "active" : ""}`}>
          <Users size={20} className="sidebar-icon" /> Kelola Pengguna
        </Link>
      </aside>

      <main className="main-with-sidebar fade-in" style={{ transition: "all 0.3s ease" }}>
        {children}
      </main>
    </>
  );
}
