"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import * as faceapi from "face-api.js";
import { Camera, CheckCircle, Bike } from "lucide-react";
import Navbar from "../../components/Navbar";

export default function UpgradeCourierPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ vehicleType: "", vehicleBrand: "", vehicleColor: "", vehiclePlate: "" });
  
  const [ktpImage, setKtpImage] = useState(null);
  const [ktpFile, setKtpFile] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const webcamRef = useRef(null);
  const [livenessTask, setLivenessTask] = useState("IDLE");
  const [livenessMessage, setLivenessMessage] = useState("");
  const livenessInterval = useRef(null);
  const [faceStatus, setFaceStatus] = useState("");

  useEffect(() => {
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
    return () => { if (livenessInterval.current) clearInterval(livenessInterval.current); };
  }, []);

  const handleNextStep = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.vehicleType || !formData.vehicleBrand || !formData.vehicleColor || !formData.vehiclePlate) {
        return setError("Harap lengkapi semua data kendaraan.");
      }
      setError("");
      setStep(2);
    } else if (step === 2) {
      if (!ktpImage) return setError("Harap unggah KTP.");
      setError("");
      setStep(3);
    }
  };

  const handleKtpUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setKtpFile(file);
    setKtpImage(URL.createObjectURL(file));
  };

  const startLivenessCheck = () => {
    if (!isModelsLoaded) return alert("AI Model masih loading...");
    if (!webcamRef.current || !webcamRef.current.video) return alert("Kamera belum siap.");

    const sequence = ["SMILE", "RIGHT"];
    let stepIndex = 0;
    let currentTask = sequence[stepIndex];
    
    setLivenessTask(currentTask);
    setLivenessMessage(currentTask === "SMILE" ? "TANTANGAN: Buka mulut / Tersenyum LEBAR 😁" : "TANTANGAN: Menoleh ke KANAN layar");

    livenessInterval.current = setInterval(async () => {
      if (!webcamRef.current) {
        clearInterval(livenessInterval.current);
        return;
      }
      const video = webcamRef.current.video;
      if (!video || video.readyState !== 4) return;

      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.2 })).withFaceLandmarks();
      if (!detection) return;

      const landmarks = detection.landmarks;
      const nose = landmarks.getNose()[0];
      const jawLeft = landmarks.getJawOutline()[0];
      const jawRight = landmarks.getJawOutline()[16];
      const mouth = landmarks.getMouth();

      const distLeft = nose.x - jawLeft.x;
      const distRight = jawRight.x - nose.x;
      const ratio = distLeft / distRight;

      const mouthVert = Math.abs(mouth[3].y - mouth[9].y);
      const mouthHoriz = Math.abs(mouth[0].x - mouth[6].x);
      const mar = mouthVert / mouthHoriz;

      let taskPassed = false;
      if (currentTask === "RIGHT" && ratio < 0.6) taskPassed = true;
      if (currentTask === "SMILE" && mar > 0.35) taskPassed = true;

      if (taskPassed) {
        stepIndex++;
        if (stepIndex < sequence.length) {
          currentTask = sequence[stepIndex];
          setLivenessTask(currentTask);
          setLivenessMessage("BAGUS! Sekarang: Menoleh ke KANAN layar");
        } else {
          setLivenessTask("MATCHING");
          setLivenessMessage("LIVENESS LULUS! Menatap lurus ke kamera untuk memotret...");
          clearInterval(livenessInterval.current);
          setTimeout(captureSelfieAndVerify, 1500);
        }
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

      const ktpDetection = await faceapi.detectSingleFace(ktpImgElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 })).withFaceLandmarks().withFaceDescriptor();
      const selfieDetection = await faceapi.detectSingleFace(selfieImgElement, new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.2 })).withFaceLandmarks().withFaceDescriptor();

      if (!ktpDetection || !selfieDetection) {
        setLivenessTask("IDLE");
        setFaceStatus("❌ Wajah di KTP atau Selfie tidak terdeteksi jelas.");
        return;
      }

      const distance = faceapi.euclideanDistance(ktpDetection.descriptor, selfieDetection.descriptor);
      if (distance < 0.50) {
        setLivenessTask("DONE");
        setFaceStatus(`✅ Wajah KTP dan Selfie COCOK! Verifikasi Selesai.`);
      } else {
        setLivenessTask("IDLE");
        setFaceStatus(`❌ Wajah TIDAK cocok dengan KTP! Ulangi.`);
      }
    } catch (err) {
      setLivenessTask("IDLE");
      setFaceStatus("❌ Terjadi kesalahan sistem saat menganalisis wajah.");
    }
  };

  const handleUpgrade = async () => {
    if (livenessTask !== "DONE") return setError("Anda harus lulus verifikasi Wajah terlebih dahulu.");
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      
      let ktpUrl = "";
      if (ktpFile) {
        const uploadData = new FormData();
        uploadData.append("image", ktpFile);
        const resUpload = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/upload`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: uploadData
        });
        const uploadResult = await resUpload.json();
        if (uploadResult.success) {
          ktpUrl = uploadResult.data.url;
        } else {
          setLoading(false);
          return setError(uploadResult.message || "Gagal mengunggah foto KTP.");
        }
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/upgrade/courier`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ ...formData, ktpUrl }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Pendaftaran Driver Berhasil! Menunggu persetujuan Admin.");
        // Refresh localstorage user profile to get new role
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/me`, { headers: { "Authorization": `Bearer ${token}` } });
        const meData = await meRes.json();
        if (meData.success) localStorage.setItem("user", JSON.stringify(meData.data));
        window.dispatchEvent(new Event("userUpdated"));
        
        router.push("/profile");
      } else {
        setError(data.message || "Gagal mendaftar.");
      }
    } catch (err) {
      setError("Terjadi kesalahan server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <Navbar />
      <div className="flex-center" style={{ padding: "8rem 2rem 4rem 2rem" }}>
        <div className="card" style={{ maxWidth: "600px", width: "100%" }}>
          <h2 style={{ textAlign: "center", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <Bike className="text-primary" size={28} /> Daftar Jadi Driver
          </h2>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem", position: "relative" }}>
            <div style={{ position: "absolute", top: "15px", left: "10%", right: "10%", height: "4px", background: "var(--color-border)", zIndex: 1 }}></div>
            {[1, 2, 3].map((num) => (
              <div key={num} style={{ 
                width: "34px", height: "34px", borderRadius: "50%", background: step >= num ? "var(--color-primary)" : "var(--color-border)",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", zIndex: 2
              }}>
                {step > num ? <CheckCircle size={16} /> : num}
              </div>
            ))}
          </div>

          {error && <div className="alert-error" style={{ marginBottom: "1rem" }}>{error}</div>}

          {step === 1 && (
            <form onSubmit={handleNextStep} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <select className="form-input" value={formData.vehicleType} onChange={(e) => setFormData({...formData, vehicleType: e.target.value})} required>
                <option value="">-- Pilih Jenis Motor --</option>
                <option value="Matic">Matic</option>
                <option value="Bebek">Bebek</option>
                <option value="Sport">Sport</option>
              </select>
              <input className="form-input" placeholder="Merek Motor (Cth: Honda Beat)" value={formData.vehicleBrand} onChange={(e) => setFormData({...formData, vehicleBrand: e.target.value})} required />
              <input className="form-input" placeholder="Warna Motor (Cth: Merah Hitam)" value={formData.vehicleColor} onChange={(e) => setFormData({...formData, vehicleColor: e.target.value})} required />
              <input className="form-input" placeholder="Plat Nomor (Cth: L 1234 XY)" value={formData.vehiclePlate} onChange={(e) => setFormData({...formData, vehiclePlate: e.target.value})} required />
              <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }}>Selanjutnya: Verifikasi KTP</button>
            </form>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <label style={{ fontWeight: "bold" }}>Unggah Foto KTP Asli:</label>
              <div style={{ position: "relative", border: "2px dashed var(--color-border)", padding: "2rem", textAlign: "center", borderRadius: "var(--radius-lg)" }}>
                {ktpImage ? (
                  <img src={ktpImage} alt="KTP" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "var(--radius-md)" }} />
                ) : (
                  <div>
                    <Camera size={48} style={{ opacity: 0.3, margin: "0 auto 1rem auto" }} />
                    <p className="text-muted">Klik untuk memilih foto KTP</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleKtpUpload} style={{ opacity: 0, position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor: "pointer" }} />
              </div>
              <button onClick={handleNextStep} className="btn btn-primary" style={{ marginTop: "1rem" }} disabled={!ktpImage}>Selanjutnya: Verifikasi Wajah AI</button>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <p style={{ textAlign: "center", marginBottom: "1rem" }}>Arahkan wajah Anda ke kamera dan ikuti instruksi AI untuk membuktikan Anda bukan robot.</p>
              
              <div style={{ position: "relative", width: "100%", maxWidth: "400px", borderRadius: "12px", overflow: "hidden", border: "4px solid var(--color-primary-light)" }}>
                <Webcam ref={webcamRef} audio={false} mirrored={true} style={{ width: "100%", height: "auto" }} />
                
                {livenessTask !== "IDLE" && livenessTask !== "DONE" && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", color: "white", padding: "1rem", textAlign: "center", fontWeight: "bold", fontSize: "1.2rem" }}>
                    {livenessMessage}
                  </div>
                )}
              </div>

              {faceStatus && <div className={faceStatus.includes("✅") ? "alert-success" : "alert-error"} style={{ width: "100%", marginTop: "1rem" }}>{faceStatus}</div>}

              {livenessTask === "IDLE" && (
                <button type="button" className="btn btn-secondary" onClick={startLivenessCheck} style={{ width: "100%" }}>Mulai Pindai Wajah</button>
              )}

              {livenessTask === "DONE" && (
                <button type="button" className="btn btn-primary" onClick={handleUpgrade} disabled={loading} style={{ width: "100%" }}>
                  {loading ? "Menyimpan Data..." : "Selesaikan Pendaftaran"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
