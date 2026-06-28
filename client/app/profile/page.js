"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import dynamic from 'next/dynamic';
import { AlertTriangle, User, Edit3, Save, Camera, Mail, Smartphone, ArrowLeft, MapPin, CheckCircle, ChefHat, LogOut, Key, Briefcase, Crown, Settings, Trash2, Bike } from "lucide-react";

const LocationPicker = dynamic(() => import('../components/LocationPicker'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}`;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem("user", JSON.stringify(data.data));
        window.dispatchEvent(new Event("userUpdated"));
        setName(data.data.name || "");
        setPhone(data.data.phone || "");
        setAddress(data.data.address || "");
        setLocation({ lat: data.data.latitude, lng: data.data.longitude });
        setPhotoUrl(data.data.photoUrl || "");
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name, phone, address, 
          latitude: location.lat, longitude: location.lng,
          photoUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        localStorage.setItem("user", JSON.stringify(data.data));
        window.dispatchEvent(new Event("userUpdated"));
        setIsEditing(false);
        alert("Profil berhasil diperbarui!");
      } else {
        alert(data.message || "Gagal memperbarui profil.");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    }
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran maksimal foto adalah 2MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setPhotoUrl(data.data.url);
      } else {
        alert(data.message || "Gagal mengunggah foto.");
      }
    } catch (err) {
      alert("Error upload foto");
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return alert("Konfirmasi password baru tidak cocok.");
    }
    if (newPassword.length < 6) {
      return alert("Password minimal 6 karakter.");
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        alert("Password berhasil diubah!");
        setShowPasswordModal(false);
        setOldPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        alert(data.message || "Gagal mengubah password.");
      }
    } catch (err) {
      alert("Terjadi kesalahan sistem.");
    }
  };

  const handleLogout = () => {
    if (confirm("Yakin ingin keluar?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("⚠️ PERINGATAN: Anda yakin ingin menghapus akun ini secara permanen? Data Anda tidak bisa dikembalikan.")) {
      try {
        const token = localStorage.getItem("token");
        await fetch(`${API_URL}/users/profile`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        localStorage.clear();
        window.location.href = "/login";
      } catch (err) {
        alert("Gagal menghapus akun.");
      }
    }
  };

  const getInitials = (fullName) => {
    if (!fullName) return <User size={48} color="white" />;
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  if (loading) return <div>Memuat profil...</div>;
  if (!user) return null;

  const hasStore = user.store && user.store.status === 'APPROVED';

  return (
    <div className="container" style={{ paddingTop: "80px", paddingBottom: "80px", maxWidth: "800px", margin: "0 auto" }}>
      <Navbar />
      
      <div style={{ marginBottom: "2rem" }}>
        <button onClick={() => router.back()} className="btn btn-secondary btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <ArrowLeft size={16} /> Kembali
        </button>
      </div>

      <div className="flex-between" style={{ marginBottom: "2rem" }}>
        <h2>Profil Saya</h2>
        {!isEditing ? (
          <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={() => setIsEditing(true)}>
            <Edit3 size={16} /> Edit Profil
          </button>
        ) : (
          <div className="flex gap-2">
            <button className="btn" onClick={() => {
              setIsEditing(false);
              setName(user.name); setPhone(user.phone || ""); setAddress(user.address || "");
              setLocation({ lat: user.latitude, lng: user.longitude }); setPhotoUrl(user.photoUrl || "");
            }}>Batal</button>
            <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={handleSave}>
              <Save size={16} /> Simpan
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="card text-center" style={{ position: "relative", padding: "2rem" }}>
          <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 1.5rem auto" }}>
            {photoUrl ? (
              <img 
                src={`${process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"}${photoUrl}`} 
                alt="Avatar" 
                style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", background: "#f0f0f0", border: "4px solid white", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
              />
            ) : (
              <div style={{ 
                width: "120px", height: "120px", borderRadius: "50%", 
                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))", 
                color: "white", display: "flex", alignItems: "center", justifyContent: "center", 
                fontSize: "3rem", fontWeight: "bold", border: "4px solid white", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" 
              }}>
                {getInitials(name || user.name)}
              </div>
            )}

            {isEditing && (
              <label style={{ 
                position: "absolute", bottom: "5px", right: "5px", background: "white", color: "black", 
                padding: "0.5rem", borderRadius: "50%", cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)", border: "1px solid var(--color-border)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Camera size={20} />
                <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleUploadPhoto} disabled={uploading} />
              </label>
            )}
          </div>
          
          {isEditing ? (
            <div style={{ maxWidth: "300px", margin: "0 auto" }}>
              <div className="form-group">
                <input type="text" className="form-control text-center" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Lengkap" />
              </div>
              <div className="form-group">
                <input type="text" className="form-control text-center" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nomor HP" />
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{user.name}</h3>
              <div style={{ marginTop: "1rem" }}>
                <p className="text-muted" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}><Mail size={16} /> {user.email}</p>
                <p className="text-muted" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}><Smartphone size={16} /> {phone || "Belum ada No HP"}</p>
              </div>
            </>
          )}
          
          {hasStore && !isEditing && (
            <div style={{ marginTop: "1.5rem", display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "var(--color-primary-light)", borderRadius: "var(--radius-md)", color: "var(--color-primary)", fontWeight: "bold" }}>
              Mitra Penjual KosEats <ChefHat size={16} />
            </div>
          )}
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin size={24} /> {user.role === 'SELLER' ? 'Lokasi Warung (Titik Jemput)' : 'Manajemen Alamat Pengiriman'}
          </h3>
          {isEditing ? (
            <div className="form-group">
              <label style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>Pilih Lokasi di Peta (Wajib untuk Akurasi Ongkir):</label>
              <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden", marginBottom: "1rem" }}>
                <LocationPicker 
                  onLocationChange={(pos) => {
                    setLocation({ lat: pos.lat, lng: pos.lng });
                    if (pos.address) setAddress(pos.address);
                  }}
                  defaultLat={location.lat || -7.280}
                  defaultLng={location.lng || 112.795}
                />
              </div>
              <label style={{ fontWeight: "bold", marginBottom: "0.5rem", display: "block" }}>Detail Alamat:</label>
              <textarea 
                className="form-control" 
                rows="3" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)}
              ></textarea>
            </div>
          ) : (
            <div style={{ 
              background: "white", 
              padding: "1.5rem", 
              borderRadius: "12px", 
              border: "1px solid #e2e8f0", 
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)" 
            }}>
              <p style={{ lineHeight: "1.6", fontWeight: "500", color: "#1e293b", fontSize: "1.05rem" }}>{user.address || "Belum ada alamat yang diatur."}</p>
              {user.latitude && user.longitude && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CheckCircle size={16} color="var(--color-primary)" /> 
                  <span className="text-sm" style={{ color: "#64748b", fontWeight: "500" }}>Titik Peta GPS Tersimpan</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
          <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Briefcase size={24} /> Navigasi Peran</h3>
          
          {user.role === 'ADMIN' ? (
            <div style={{ background: "var(--color-primary-light)", padding: "1.5rem", borderRadius: "var(--radius-md)", textAlign: "center" }}>
              <h4 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}><Crown size={20} className="text-primary" /> Panel Kendali Admin</h4>
              <p className="text-sm" style={{ marginBottom: "1.5rem", color: "#475569" }}>Anda memiliki hak akses penuh untuk mengelola platform KosEats.</p>
              <Link href="/admin" className="btn btn-primary" style={{ display: "inline-block", padding: "0.75rem 2rem", width: "100%", transition: "all 0.3s ease" }}>Masuk ke Dashboard Admin</Link>
            </div>
          ) : user.role === 'BUYER' ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "var(--color-primary-light)", padding: "1.5rem", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                <h4 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}><ChefHat size={20} className="text-primary" /> Buka Usaha KosEats</h4>
                <p className="text-sm" style={{ marginBottom: "1.5rem", color: "#475569" }}>Mulai hasilkan uang dari masakan Anda.</p>
                <Link href="/upgrade/seller" className="btn btn-primary" style={{ display: "inline-block", padding: "0.75rem", width: "100%", transition: "all 0.3s ease", fontSize: "0.9rem" }}>Mulai Berjualan</Link>
              </div>
              <div style={{ background: "#e0f2fe", padding: "1.5rem", borderRadius: "var(--radius-md)", textAlign: "center" }}>
                <h4 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#0284c7" }}><Bike size={20} /> Gabung Jadi Driver</h4>
                <p className="text-sm" style={{ marginBottom: "1.5rem", color: "#475569" }}>Manfaatkan motor nganggur Anda.</p>
                <Link href="/upgrade/courier" className="btn" style={{ background: "#0284c7", color: "white", display: "inline-block", padding: "0.75rem", width: "100%", transition: "all 0.3s ease", fontSize: "0.9rem" }}>Daftar Jadi Driver</Link>
              </div>
            </div>
          ) : user.role === 'SELLER' ? (
            <div style={{ background: "var(--color-warning-light)", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
              <h4 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><ChefHat size={20} className="text-primary" /> Dashboard Penjual Aktif</h4>
              <p className="text-sm" style={{ marginBottom: "1.5rem", color: "#475569" }}>Kelola pesanan, perbarui menu jualan, dan pantau penghasilan Anda.</p>
              <Link href="/seller" className="btn btn-primary" style={{ display: "inline-block", padding: "0.75rem 2rem", transition: "all 0.3s ease" }}>Buka Dashboard Toko</Link>
            </div>
          ) : user.role === 'COURIER' ? (
            <div style={{ background: "#e0f2fe", padding: "1.5rem", borderRadius: "var(--radius-md)" }}>
              <h4 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#0284c7" }}><Bike size={20} /> Dashboard Kurir Aktif</h4>
              <p className="text-sm" style={{ marginBottom: "1.5rem", color: "#475569" }}>Lihat radar orderan dan kelola tugas pengantaran Anda.</p>
              <Link href="/courier" className="btn" style={{ background: "#0284c7", color: "white", display: "inline-block", padding: "0.75rem 2rem", transition: "all 0.3s ease" }}>Buka Tugas Kurir</Link>
            </div>
          ) : null}
        </div>

        <div className="card" style={{ padding: "2rem" }}>
          <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Settings size={24} /> Keamanan Akun</h3>
          <div className="flex gap-4">
            <button className="btn btn-secondary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }} onClick={() => setShowPasswordModal(true)}>
              <Key size={16} /> Ubah Password
            </button>
            <button className="btn btn-outline" style={{ flex: 1, borderColor: "var(--color-error)", color: "var(--color-error)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }} onClick={handleLogout}>
              <LogOut size={16} /> Keluar
            </button>
          </div>
          <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
            <button className="btn btn-danger" variant="ghost" onClick={handleDeleteAccount} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Trash2 size={16} /> Hapus Akun Permanen
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}><Key size={20} /> Ubah Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Password Lama</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Password Baru</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Konfirmasi Password Baru</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  minLength={6}
                />
              </div>
              <div className="flex gap-2" style={{ marginTop: "2rem" }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPasswordModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
