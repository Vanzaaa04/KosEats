"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import map to prevent SSR errors
const LocationPicker = dynamic(() => import("../components/LocationPicker"), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  
  const [role, setRole] = useState("BUYER");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "", address: "", storeName: "", storeDescription: "" });
  const [location, setLocation] = useState({ lat: -7.280, lng: 112.795 });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEmailValid = formData.email ? /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(formData.email.toLowerCase()) : false;
  const isPhoneValid = formData.phone && formData.phone.length >= 8;
  const isPasswordValid = formData.password && formData.password.length >= 6;
  const isFormValid = formData.name && isEmailValid && isPasswordValid && formData.address && isPhoneValid && (role === 'SELLER' ? formData.storeName : true);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!isFormValid) {
      return setError("Harap lengkapi semua data dan lokasi dengan benar.");
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          role: role,
          latitude: location.lat,
          longitude: location.lng
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Pendaftaran Berhasil! Silakan login.");
        router.push("/login");
      } else {
        setError(data.message || "Pendaftaran gagal");
      }
    } catch (err) {
      setError("Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: "100vh", padding: "2rem", background: "var(--color-bg)" }}>
      <div className="card" style={{ maxWidth: "500px", width: "100%" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Daftar Akun KosEats</h2>
        
        {/* TABS */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            className={`btn ${role === 'BUYER' ? 'btn-primary' : ''}`} 
            style={{ flex: 1, border: role === 'BUYER' ? 'none' : '1px solid #e2e8f0', background: role === 'BUYER' ? 'var(--color-primary)' : 'transparent', color: role === 'BUYER' ? 'white' : '#64748b' }}
            onClick={() => { setRole('BUYER'); setError(''); }}
            type="button"
          >
            🧑‍🎓 Pelanggan
          </button>
          <button 
            className={`btn ${role === 'SELLER' ? 'btn-warning' : ''}`} 
            style={{ flex: 1, border: role === 'SELLER' ? 'none' : '1px solid #e2e8f0', background: role === 'SELLER' ? 'var(--color-warning)' : 'transparent', color: role === 'SELLER' ? 'white' : '#64748b' }}
            onClick={() => { setRole('SELLER'); setError(''); }}
            type="button"
          >
            🧑‍🍳 Buka Usaha
          </button>
        </div>
        {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input className="form-input" placeholder="Nama Lengkap" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          
          <div>
            <input className={`form-input ${formData.email && !isEmailValid ? 'input-error' : ''}`} type="email" placeholder="Email (@gmail.com)" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            {formData.email && !isEmailValid && <small style={{ color: "var(--color-error)", display: "block", marginTop: "0.25rem" }}>Harap gunakan email @gmail.com</small>}
          </div>

          <div>
            <input className="form-input" placeholder="No HP (Minimal 8 angka)" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} />
            {formData.phone && !isPhoneValid && <small style={{ color: "var(--color-error)", display: "block", marginTop: "0.25rem" }}>No HP minimal 8 angka</small>}
          </div>

          <div>
            <input className={`form-input ${formData.password && !isPasswordValid ? 'input-error' : ''}`} type="password" placeholder="Password (Minimal 6 karakter)" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            {formData.password && !isPasswordValid && <small style={{ color: "var(--color-error)", display: "block", marginTop: "0.25rem" }}>Password minimal 6 karakter</small>}
          </div>

          {role === 'SELLER' && (
            <div style={{ padding: "1rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", border: "1px dashed var(--color-warning)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h4 style={{ color: "var(--color-warning)", margin: 0 }}>Informasi Toko</h4>
              <input className="form-input" placeholder="Nama Warung / Toko (Wajib)" value={formData.storeName} onChange={(e) => setFormData({...formData, storeName: e.target.value})} />
              <textarea className="form-input" placeholder="Deskripsi Singkat Jualan Anda (Opsional)" value={formData.storeDescription} onChange={(e) => setFormData({...formData, storeDescription: e.target.value})} />
            </div>
          )}

          <textarea className="form-input" placeholder={role === 'SELLER' ? "Detail Alamat Warung (Cth: Jalan Mawar No. 10)" : "Detail Alamat Kos (Cth: Kos Warna Biru No.12, Kamar 5)"} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Pin Lokasi Kos (Peta):</label>
            <LocationPicker 
              onLocationChange={(pos) => {
                setLocation({ lat: pos.lat, lng: pos.lng });
                if (pos.address) {
                  setFormData(prev => ({ ...prev, address: pos.address }));
                }
              }} 
              defaultLat={location.lat} 
              defaultLng={location.lng} 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={loading || !isFormValid}>
            {loading ? "Mendaftar..." : "Daftar Sekarang"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Sudah punya akun? <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: "bold" }}>Masuk</Link>
        </p>
      </div>
    </div>
  );
}
