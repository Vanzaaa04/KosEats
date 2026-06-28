"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('../../components/LocationPicker'), { ssr: false });

export default function RegisterSellerPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState({ lat: -7.280, lng: 112.795 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !address || !location.lat || !location.lng) {
      return alert("Mohon lengkapi semua data wajib (termasuk titik lokasi peta).");
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Silakan login terlebih dahulu.");
        return router.push("/login");
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/stores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          description,
          address,
          latitude: location.lat,
          longitude: location.lng
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("🎉 Pendaftaran berhasil! Silakan login ulang untuk memuat ulang profil Anda.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      } else {
        alert(data.message || "Gagal mendaftar.");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: "100px" }}>
      <Navbar />
      
      <div className="container" style={{ paddingTop: "100px", maxWidth: "600px" }}>
        <div className="card">
          <div className="text-center" style={{ marginBottom: "2rem" }}>
            <h2>Buka Usaha KosEats 🏪</h2>
            <p className="text-muted">Lengkapi data warung Anda di bawah ini.</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nama Warung/Usaha <span className="text-danger">*</span></label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Contoh: Nasi Goreng Bu Ayu Kos" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Deskripsi Singkat</label>
              <textarea 
                className="form-control" 
                rows="2" 
                placeholder="Contoh: Spesialis nasi goreng pedas mampus murah meriah" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <div className="form-group">
              <label>Titik Lokasi (Peta) <span className="text-danger">*</span></label>
              <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "0.5rem" }}>
                <LocationPicker 
                  onLocationChange={(pos) => {
                    setLocation({ lat: pos.lat, lng: pos.lng });
                    if (pos.address) setAddress(pos.address);
                  }}
                  defaultLat={location.lat}
                  defaultLng={location.lng}
                />
              </div>
              <p className="text-sm text-muted">Akurasi peta sangat penting agar kurir tidak nyasar.</p>
            </div>

            <div className="form-group">
              <label>Detail Alamat Lengkap <span className="text-danger">*</span></label>
              <textarea 
                className="form-control" 
                rows="3" 
                placeholder="Contoh: Jalan Kejawan Putih Tambak No 10, Pagar Hitam (Kos Putri)" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem", marginTop: "1rem" }} disabled={loading}>
              {loading ? "Memproses..." : "Daftar Sekarang"}
            </button>
            <div className="text-center" style={{ marginTop: "1rem" }}>
              <Link href="/profile" className="text-muted">Batal & Kembali</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
