"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Halaman Login KosEats
 * Split layout: Form kiri, branding visual kanan
 */
export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot Password States
  const [forgotStep, setForgotStep] = useState(0); // 0 = Login, 1 = Email, 2 = OTP, 3 = Reset
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login gagal");
      }

      // Simpan token & user data ke localStorage
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));

      // Redirect sesuai role
      const role = data.data.user.role;
      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "SELLER") {
        router.push("/seller");
      } else {
        router.push("/explore");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Sisi Kiri — Form Login */}
      <div className="auth-left">
        <Link href="/" className="navbar-brand" style={{ marginBottom: "2rem" }}>
          <img src="/logo.png" alt="KosEats Logo" className="navbar-logo-image" style={{ width: '48px', height: '48px', mixBlendMode: 'multiply' }} />
          <span className="navbar-logo-text">
            Kos<span className="text-primary">Eats</span>
          </span>
        </Link>

        {successMsg && (
          <div className="toast" style={{ backgroundColor: "#10b981", color: "white", position: "relative", marginBottom: "1rem", top: 0, right: 0 }}>
            {successMsg}
          </div>
        )}

        {forgotStep === 0 && (
          <>
            <div className="auth-form-header">
              <h1>Selamat Datang! 👋</h1>
              <p>Masuk ke akunmu untuk pesan makanan rumahan terenak</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} id="login-form">
              {error && (
                <div
                  className="toast toast-error"
                  style={{ position: "relative", top: 0, right: 0, marginBottom: "1rem" }}
                >
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  📧 Email
                </label>
                <div className="form-input-icon">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="contoh@mahasiswa.id"
                    value={form.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                    🔒 Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => { setForgotStep(1); setSuccessMsg(""); setError(""); }} 
                    style={{ background: "none", border: "none", color: "var(--color-primary-600)", fontSize: "0.875rem", cursor: "pointer", fontWeight: "600" }}
                  >
                    Lupa Password?
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{ marginTop: "0.5rem" }}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={loading}
                id="login-submit"
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>

              <div className="auth-divider">atau</div>

              <p className="auth-footer-text">
                Belum punya akun?{" "}
                <Link href="/register">Daftar sekarang</Link>
              </p>
            </form>
          </>
        )}

        {forgotStep === 1 && (
          <>
            <div className="auth-form-header">
              <h1>Lupa Password 🔑</h1>
              <p>Masukkan email Anda, kami akan mengirimkan kode OTP untuk reset password.</p>
            </div>
            <form className="auth-form" onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setForgotError("");
              // SIMULASI API CALL
              setTimeout(() => {
                if (!forgotEmail.includes("@")) {
                  setForgotError("Email tidak valid!");
                } else {
                  setForgotStep(2);
                }
                setLoading(false);
              }, 1000);
            }}>
              {forgotError && <div className="toast toast-error" style={{ position: "relative", marginBottom: "1rem", top: 0, right: 0 }}>{forgotError}</div>}
              
              <div className="form-group">
                <label className="form-label">📧 Email Terdaftar</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="Masukkan email Anda" 
                  value={forgotEmail} 
                  onChange={(e) => setForgotEmail(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                {loading ? "Mengirim..." : "Kirim Kode OTP"}
              </button>
              <button type="button" className="btn btn-outline btn-lg btn-block" style={{ marginTop: "1rem" }} onClick={() => setForgotStep(0)}>
                Kembali ke Login
              </button>
            </form>
          </>
        )}

        {forgotStep === 2 && (
          <>
            <div className="auth-form-header">
              <h1>Verifikasi OTP 🛡️</h1>
              <p>Masukkan 6 digit kode OTP yang telah dikirim ke email <strong>{forgotEmail}</strong></p>
            </div>
            <form className="auth-form" onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setForgotError("");
              // SIMULASI API CALL
              setTimeout(() => {
                if (otp.length < 6) {
                  setForgotError("Kode OTP harus 6 digit!");
                } else {
                  setForgotStep(3); // Lanjut ke reset password
                }
                setLoading(false);
              }, 1000);
            }}>
              {forgotError && <div className="toast toast-error" style={{ position: "relative", marginBottom: "1rem", top: 0, right: 0 }}>{forgotError}</div>}
              
              <div className="form-group">
                <label className="form-label">🔢 Kode OTP (MOCK: Bebas isi angka)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Contoh: 123456" 
                  maxLength={6}
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  required 
                  style={{ fontSize: "1.5rem", letterSpacing: "0.5rem", textAlign: "center" }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                {loading ? "Memverifikasi..." : "Verifikasi OTP"}
              </button>
              <button type="button" className="btn btn-outline btn-lg btn-block" style={{ marginTop: "1rem" }} onClick={() => setForgotStep(1)}>
                Ganti Email
              </button>
            </form>
          </>
        )}

        {forgotStep === 3 && (
          <>
            <div className="auth-form-header">
              <h1>Buat Password Baru 🔐</h1>
              <p>Kode OTP valid. Silakan buat password baru Anda yang kuat dan aman.</p>
            </div>
            <form className="auth-form" onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setForgotError("");
              // SIMULASI API CALL
              setTimeout(() => {
                if (newPassword !== confirmPassword) {
                  setForgotError("Konfirmasi password tidak cocok!");
                } else if (newPassword.length < 6) {
                  setForgotError("Password minimal 6 karakter!");
                } else {
                  setForgotStep(0); // Kembali ke login
                  setSuccessMsg("Password berhasil diubah! Silakan login dengan password baru.");
                  setForgotEmail(""); setOtp(""); setNewPassword(""); setConfirmPassword("");
                }
                setLoading(false);
              }, 1500);
            }}>
              {forgotError && <div className="toast toast-error" style={{ position: "relative", marginBottom: "1rem", top: 0, right: 0 }}>{forgotError}</div>}
              
              <div className="form-group">
                <label className="form-label">🔑 Password Baru</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Masukkan password baru" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">🔁 Konfirmasi Password Baru</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Ketik ulang password baru" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Password Baru"}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Sisi Kanan — Visual Branding */}
      <div className="auth-right">
        <div className="auth-right-content">
          <div className="auth-right-emoji" style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
            <div style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "50%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "160px",
              height: "160px"
            }}>
              <img src="/logo.png" alt="KosEats Visual" style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
            </div>
          </div>
          <h2>Lapar? Pesan Aja!</h2>
          <p>
            Masakan rumahan dari ibu-ibu di sekitar kos-mu. 
            Murah, dekat, dan kamu bisa cek info gizinya sebelum pesan.
          </p>
        </div>
      </div>
    </div>
  );
}
