"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { Heart, Search, Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return router.push("/login");
      }
      const res = await fetch(`${API_URL}/users/favorites`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFavorites(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (storeId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/favorites/${storeId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFavorites(favorites.filter(f => f.store.id !== storeId));
      }
    } catch (err) {
      alert("Gagal menghapus dari favorit");
    }
  };

  return (
    <div style={{ paddingBottom: "100px" }}>
      <Navbar />
      <div className="container" style={{ marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Heart size={32} className="text-error" fill="currentColor" /> Wishlist Toko Favorit
        </h2>
        
        {loading ? (
          <div>Memuat daftar favorit...</div>
        ) : favorites.length === 0 ? (
          <div className="card text-center" style={{ padding: "3rem 1rem" }}>
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Heart size={48} className="text-muted" /></div>
              <h3 style={{ marginBottom: "1rem" }}>Belum Ada Favorit</h3>
              <p className="empty-state-text" style={{ marginBottom: "2rem" }}>Kamu belum punya toko favorit nih.</p>
              <Link href="/explore" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={16} /> Cari Makanan Enak
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md-grid-cols-2 lg-grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <div key={fav.id} className="card" style={{ position: "relative" }}>
                <div style={{ height: "150px", backgroundColor: "#f3f4f6", borderRadius: "var(--radius-md)", marginBottom: "1rem", overflow: "hidden" }}>
                  {fav.store.photoUrl ? (
                    <img src={fav.store.photoUrl} alt={fav.store.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>Tidak ada foto</div>
                  )}
                </div>
                <h3>{fav.store.name}</h3>
                <p className="text-sm text-muted" style={{ marginBottom: "1rem", minHeight: "40px" }}>
                  {fav.store.description || "Tidak ada deskripsi."}
                </p>
                <div className="flex-between">
                  <Link href={`/store/${fav.store.id}`} className="btn btn-outline btn-sm">Lihat Menu</Link>
                  <button onClick={() => handleRemoveFavorite(fav.store.id)} className="btn btn-danger btn-sm" aria-label="Hapus Favorit">
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
