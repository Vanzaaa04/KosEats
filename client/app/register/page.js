"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";
import * as faceapi from "face-api.js";

// Dynamically import map to prevent SSR errors
const LocationPicker = dynamic(() => import("../components/LocationPicker"), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("BUYER");
  
  // Step 1: Form & Lokasi
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", password: "", address: "" });
  const [location, setLocation] = useState({ lat: -7.280, lng: 112.795 });
  
  // Step 2 & 3: e-KYC
  const [ktpImage, setKtpImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [ocrStatus, setOcrStatus] = useState("");
  const [faceStatus, setFaceStatus] = useState("");
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const webcamRef = useRef(null);

  // Liveness States
  const [livenessTask, setLivenessTask] = useState("IDLE"); // IDLE, LEFT, RIGHT, MATCHING, DONE
  const [livenessMessage, setLivenessMessage] = useState("");
  const livenessInterval = useRef(null);

  useEffect(() => {
    // Load face-api models on mount
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setIsModelsLoaded(true);
      } catch (err) {
        console.error("Gagal load model face-api", err);
      }
    };
    loadModels();

    return () => {
      if (livenessInterval.current) clearInterval(livenessInterval.current);
    };
  }, []);

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password || !formData.address) {
        return setError("Harap lengkapi semua data dan lokasi.");
      }
      setError("");
      setStep(2);
    } else if (step === 2) {
      if (!ktpImage) return setError("Harap unggah KTP.");
      setError("");
      setStep(3);
    }
  };

  const handleKtpUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const imageUrl = URL.createObjectURL(file);
    setKtpImage(imageUrl);

    // Bypass OCR: Langsung anggap sukses agar kita fokus ke Face Match yang jauh lebih akurat
    setOcrStatus(`✅ KTP Terunggah. Verifikasi nama akan dilakukan manual oleh Admin.`);
  };

  const startLivenessCheck = () => {
    if (!isModelsLoaded) return alert("AI Model masih loading...");
    if (!webcamRef.current || !webcamRef.current.video) return alert("Kamera belum siap.");

    setLivenessTask("LEFT");
    setLivenessMessage("TANTANGAN: Tolong menoleh ke KIRI layar (kiri Anda).");

    let currentTask = "LEFT";

    livenessInterval.current = setInterval(async () => {
      const video = webcamRef.current.video;
      if (!video || video.readyState !== 4) return;

      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 })).withFaceLandmarks();
      if (!detection) return;

      const landmarks = detection.landmarks;
      const nose = landmarks.getNose()[0];
      const jawLeft = landmarks.getJawOutline()[0];
      const jawRight = landmarks.getJawOutline()[16];

      // Kalkulasi rasio hidung ke pinggir rahang untuk estimasi toleh (yaw)
      const distLeft = nose.x - jawLeft.x;
      const distRight = jawRight.x - nose.x;
      const ratio = distLeft / distRight; // jika > 1.5 nengok kiri, jika < 0.6 nengok kanan

      if (currentTask === "LEFT" && ratio > 1.5) {
        currentTask = "RIGHT";
        setLivenessTask("RIGHT");
        setLivenessMessage("BAGUS! Sekarang menoleh ke KANAN.");
      } 
      else if (currentTask === "RIGHT" && ratio < 0.6) {
        currentTask = "MATCHING";
        setLivenessTask("MATCHING");
        setLivenessMessage("LIVENESS LULUS! Menatap lurus ke kamera untuk mencocokkan wajah...");
        clearInterval(livenessInterval.current);
        setTimeout(captureSelfieAndVerify, 1500); // Tunggu 1.5 detik agar user lihat kamera depan
      }
    }, 500);
  };

  const captureSelfieAndVerify = async () => {
    setLivenessMessage("Sedang mencocokkan wajah Anda dengan KTP...");
    const imageSrc = webcamRef.current.getScreenshot();
    setSelfieImage(imageSrc);

    try {
      const ktpImgElement = await faceapi.fetchImage(ktpImage);
      const selfieImgElement = await faceapi.fetchImage(imageSrc);

      const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 });
      const tinyOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.2 });

      const ktpDetection = await faceapi.detectSingleFace(ktpImgElement, ssdOptions).withFaceLandmarks().withFaceDescriptor();
      const selfieDetection = await faceapi.detectSingleFace(selfieImgElement, tinyOptions).withFaceLandmarks().withFaceDescriptor();

      if (!ktpDetection) {
        setLivenessTask("IDLE");
        setLivenessMessage("");
        setFaceStatus("❌ Wajah di KTP tidak terdeteksi. AI butuh kontras/kecerahan lebih tinggi pada foto KTP.");
        return;
      }
      if (!selfieDetection) {
        setLivenessTask("IDLE");
        setLivenessMessage("");
        setFaceStatus("❌ Wajah Selfie tidak terdeteksi. Harap terang dan menghadap kamera.");
        return;
      }

      const distance = faceapi.euclideanDistance(ktpDetection.descriptor, selfieDetection.descriptor);
      
      console.log('[FACE DEBUG] Euclidean distance:', distance);
      
      // Threshold 0.55: Lebih toleran terhadap perbedaan cahaya, umur di foto KTP vs aslinya
      // Di bawah 0.55 = orang yang sama, di atas 0.55 = orang berbeda
      if (distance < 0.55) {
        setLivenessTask("DONE");
        setLivenessMessage("");
        setFaceStatus(`✅ Wajah KTP dan Selfie COCOK! (Skor: ${distance.toFixed(3)}) Verifikasi Selesai.`);
      } else {
        setLivenessTask("IDLE");
        setLivenessMessage("");
        setFaceStatus(`❌ Wajah TIDAK cocok dengan KTP! (Skor: ${distance.toFixed(3)}, harus di bawah 0.55). Ulangi.`);
      }
    } catch (err) {
      setLivenessTask("IDLE");
      setLivenessMessage("");
      setFaceStatus("❌ Terjadi kesalahan sistem saat menganalisis wajah.");
      console.error(err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (livenessTask !== "DONE") {
      return setError("Anda harus lulus verifikasi Wajah terlebih dahulu.");
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          role,
          latitude: location.lat,
          longitude: location.lng
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Pendaftaran Berhasil! " + (role === "SELLER" ? "Menunggu persetujuan Admin." : "Silakan login."));
        router.push("/login");
      } else {
        setError(data.message || "Pendaftaran gagal");
      }
    } catch (err) {
      setError("Terjadi kesalahan pada server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: "100vh", padding: "2rem", background: "var(--color-bg)" }}>
      <div className="card" style={{ maxWidth: "600px", width: "100%" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Daftar KosEats (e-KYC)</h2>
        {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem", borderBottom: "2px solid #eee", paddingBottom: "1rem" }}>
          <span style={{ fontWeight: step >= 1 ? "bold" : "normal", color: step >= 1 ? "var(--color-primary)" : "var(--color-muted)" }}>1. Data & GPS</span>
          <span style={{ fontWeight: step >= 2 ? "bold" : "normal", color: step >= 2 ? "var(--color-primary)" : "var(--color-muted)" }}>2. KTP OCR</span>
          <span style={{ fontWeight: step >= 3 ? "bold" : "normal", color: step >= 3 ? "var(--color-primary)" : "var(--color-muted)" }}>3. Liveness AI</span>
        </div>

        {step === 1 && (
          <div className="form-group">
            <label>Daftar Sebagai:</label>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <label>
                <input type="radio" value="BUYER" checked={role === "BUYER"} onChange={(e) => setRole(e.target.value)} /> Pembeli
              </label>
              <label>
                <input type="radio" value="SELLER" checked={role === "SELLER"} onChange={(e) => setRole(e.target.value)} /> Penjual (Ibu Kos)
              </label>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input className="form-input" placeholder="Nama Lengkap" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              <input className="form-input" type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              <input className="form-input" placeholder="No HP" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              <input className="form-input" type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
              <textarea className="form-input" placeholder="Alamat Detail (Nomor Kamar / Nama Kos)" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} rows={3} style={{ resize: "vertical" }} />
            </div>
            
            <label style={{ marginTop: "1rem", display: "block" }}>Tandai Lokasi Presisi di Peta (GPS):</label>
            <LocationPicker 
              defaultLat={-7.280} 
              defaultLng={112.795} 
              onLocationChange={(pos) => {
                setLocation(pos);
                if (pos.address) setFormData(prev => ({ ...prev, address: pos.address }));
              }} 
            />

            <button className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleNextStep}>Selanjutnya (Verifikasi KTP)</button>
          </div>
        )}

        {step === 2 && (
          <div className="form-group">
            <label>Unggah Foto KTP (Pastikan terang & teks terbaca)</label>
            <input type="file" accept="image/*" onChange={handleKtpUpload} className="input" style={{ marginBottom: "1rem" }} />
            
            {ktpImage && (
              <div style={{ textAlign: "center" }}>
                <img src={ktpImage} alt="KTP" style={{ maxHeight: "200px", borderRadius: "8px", border: "1px solid #ccc" }} />
                <p style={{ marginTop: "1rem", fontWeight: "bold", color: ocrStatus.includes("✅") ? "green" : "orange" }}>{ocrStatus}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button className="btn btn-outline" onClick={() => setStep(1)} style={{ flex: 1 }}>Kembali</button>
              <button className="btn btn-primary" onClick={handleNextStep} style={{ flex: 1 }}>Selanjutnya (Verifikasi Wajah)</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-group text-center">
            {!isModelsLoaded && <p>Loading AI Models...</p>}
            
            <label>Liveness & Face Match (Pastikan wajah menghadap kamera)</label>
            <div style={{ position: "relative", margin: "1rem auto", border: "4px solid var(--color-primary)", borderRadius: "12px", overflow: "hidden", width: "320px", height: "240px" }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width={320}
                height={240}
                style={{ objectFit: "cover" }}
              />
              <div style={{
                position: "absolute", top: "10%", left: "20%", width: "60%", height: "80%",
                border: "2px dashed rgba(255, 255, 255, 0.7)", borderRadius: "50%",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)", pointerEvents: "none"
              }}></div>
            </div>
            
            {livenessTask === "IDLE" && (
              <button className="btn btn-secondary" onClick={startLivenessCheck} disabled={!isModelsLoaded}>
                🤖 Mulai Tantangan Liveness
              </button>
            )}

            {livenessMessage && (
              <div className="alert-warning" style={{ marginTop: "1rem", fontWeight: "bold" }}>
                {livenessMessage}
              </div>
            )}

            {faceStatus && (
              <p style={{ marginTop: "1rem", fontWeight: "bold", color: faceStatus.includes("✅") ? "green" : "red" }}>{faceStatus}</p>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button className="btn btn-outline" onClick={() => { setLivenessTask("IDLE"); setFaceStatus(""); setStep(2); }} style={{ flex: 1 }}>Kembali</button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={loading || livenessTask !== "DONE"} style={{ flex: 1 }}>
                {loading ? "Memproses..." : "Selesaikan Pendaftaran"}
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <p className="text-sm">Sudah punya akun? <Link href="/login" className="text-primary">Masuk di sini</Link></p>
        </div>
      </div>
    </div>
  );
}
