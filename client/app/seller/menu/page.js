"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ClipboardList, PlusCircle, Image as ImageIcon, Utensils, Leaf } from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function SellerMenuPage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    dailyStock: "",
    category: "NASI_LAUK",
    photoUrl: "",
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
    ingredients: ""
  });

  useEffect(() => {
    fetchMyMenus();
  }, []);

  const fetchMyMenus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const res = await fetch(`${API_URL}/menus/my`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMenus(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const token = localStorage.getItem("token");
    const fd = new FormData();
    fd.append("image", file);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, photoUrl: `http://localhost:5000${data.data.url}` }));
      } else {
        alert(data.message || "Gagal mengunggah foto");
      }
    } catch (err) {
      alert("Error mengunggah foto");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddMenu = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      
      const url = editingMenuId 
        ? `${API_URL}/menus/${editingMenuId}`
        : `${API_URL}/menus`;
        
      const method = editingMenuId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseInt(formData.price),
          dailyStock: parseInt(formData.dailyStock),
          category: formData.category,
          photoUrl: formData.photoUrl,
          nutrition: (formData.calories || formData.proteinG || formData.carbsG || formData.fatG || formData.ingredients) ? {
            calories: formData.calories || null,
            proteinG: formData.proteinG || null,
            carbsG: formData.carbsG || null,
            fatG: formData.fatG || null,
            ingredients: formData.ingredients || null
          } : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        resetForm();
        fetchMyMenus();
      } else {
        alert(data.message || "Gagal menyimpan menu");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan menu");
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/menus/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchMyMenus();
      } else {
        alert(data.message || "Gagal menghapus menu");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus menu");
    }
  };

  const openEditModal = (menu) => {
    setFormData({
      name: menu.name,
      description: menu.description || "",
      price: menu.price,
      dailyStock: menu.dailyStock,
      category: menu.category,
      photoUrl: menu.photoUrl || "",
      calories: menu.nutrition?.calories || "",
      proteinG: menu.nutrition?.proteinG || "",
      carbsG: menu.nutrition?.carbsG || "",
      fatG: menu.nutrition?.fatG || "",
      ingredients: menu.nutrition?.ingredients || ""
    });
    setEditingMenuId(menu.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "", description: "", price: "", dailyStock: "", category: "NASI_LAUK", 
      photoUrl: "", calories: "", proteinG: "", carbsG: "", fatG: "", ingredients: ""
    });
    setEditingMenuId(null);
  };

  function formatPrice(price) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
  }

  return (
    <div>
      <div className="explore-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><ClipboardList size={32} className="text-primary" /> Kelola Menu</h1>
          <p className="text-muted">Tambah atau update menu jualanmu.</p>
        </div>
        <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }} onClick={() => { resetForm(); setShowModal(true); }}>
          <PlusCircle size={18} /> Tambah Menu Baru
        </button>
      </div>

      {loading ? <p>Loading menus...</p> : (
        <div className="grid grid-3" style={{ marginTop: "2rem" }}>
          {menus.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
              <div className="empty-state-icon"><ClipboardList size={48} className="text-muted" /></div>
              <p className="empty-state-text">Belum ada menu yang ditambahkan.</p>
            </div>
          ) : menus.map(menu => (
            <div className="card" key={menu.id} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ height: "180px", background: "var(--color-bg)", borderRadius: "var(--radius-md) var(--radius-md) 0 0", marginBottom: "1rem", overflow: "hidden", position: "relative" }}>
                {menu.photoUrl ? (
                  <img src={menu.photoUrl} alt={menu.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div className="flex-center" style={{ width: "100%", height: "100%" }}><Utensils size={48} className="text-muted" /></div>
                )}
                <span className="badge badge-primary" style={{ position: "absolute", top: "10px", right: "10px" }}>{menu.category}</span>
              </div>
              
              <h4 style={{ marginBottom: "0.5rem" }}>{menu.name}</h4>
              <p className="text-sm text-muted" style={{ marginBottom: "1rem", flex: 1 }}>{menu.description}</p>
              
              <div className="flex-between" style={{ marginBottom: "1rem" }}>
                <span className="text-primary" style={{ fontWeight: "bold" }}>{formatPrice(menu.price)}</span>
                <span className="text-sm">Stok: {menu.dailyStock}</span>
              </div>
              
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEditModal(menu)}>Edit</button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleDeleteMenu(menu.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah/Edit Menu */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: "1.5rem" }}>{editingMenuId ? "Edit Menu" : "Tambah Menu Baru"}</h3>
            <form onSubmit={handleAddMenu}>
              
              <div className="form-group">
                <label className="form-label">Foto Menu</label>
                <div style={{ border: "2px dashed var(--color-border)", borderRadius: "var(--radius-md)", padding: "2rem", textAlign: "center", position: "relative" }}>
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" style={{ maxHeight: "150px", objectFit: "contain", margin: "0 auto", borderRadius: "var(--radius-sm)" }} />
                  ) : (
                    <div>
                      <div style={{ marginBottom: "0.5rem" }}><ImageIcon size={48} className="text-muted" /></div>
                      <p className="text-sm text-muted">Upload foto makanan (Disarankan rasio 4:3)</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                </div>
                {uploadingImage && <p className="text-sm text-primary" style={{ marginTop: "0.5rem" }}>Mengunggah foto...</p>}
              </div>

              <div className="form-group">
                <label className="form-label">Nama Menu</label>
                <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Ayam Geprek Sambal Bawang" />
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea className="form-input" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Deskripsikan makanan Anda..."></textarea>
              </div>

              <div className="grid grid-2" style={{ gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Harga (Rp)</label>
                  <input type="number" className="form-input" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="15000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="NASI_LAUK">Nasi + Lauk</option>
                    <option value="LAUK">Lauk Saja</option>
                    <option value="SAYUR">Sayur</option>
                    <option value="CEMILAN">Cemilan</option>
                    <option value="MINUMAN">Minuman</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Stok Harian (Porsi)</label>
                <input type="number" className="form-input" required value={formData.dailyStock} onChange={e => setFormData({...formData, dailyStock: e.target.value})} placeholder="30" />
              </div>

              <hr style={{ margin: "2rem 0" }} />
              <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <Leaf size={24} className="text-success" /> Info Gizi (Opsional)
              </h4>
              
              <div className="grid grid-4" style={{ gap: "1rem", marginBottom: "1rem" }}>
                <div className="form-group">
                  <label className="form-label text-xs">Kalori (kcal)</label>
                  <input type="number" className="form-input" value={formData.calories} onChange={e => setFormData({...formData, calories: e.target.value})} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Protein (g)</label>
                  <input type="number" className="form-input" value={formData.proteinG} onChange={e => setFormData({...formData, proteinG: e.target.value})} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Karbo (g)</label>
                  <input type="number" className="form-input" value={formData.carbsG} onChange={e => setFormData({...formData, carbsG: e.target.value})} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs">Lemak (g)</label>
                  <input type="number" className="form-input" value={formData.fatG} onChange={e => setFormData({...formData, fatG: e.target.value})} placeholder="0" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Komposisi/Bahan</label>
                <input type="text" className="form-input" value={formData.ingredients} onChange={e => setFormData({...formData, ingredients: e.target.value})} placeholder="Ayam, cabai, bawang, nasi..." />
              </div>

              <div className="flex gap-2" style={{ marginTop: "2rem" }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Batal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploadingImage}>
                  {editingMenuId ? "Simpan Perubahan" : "Simpan Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
