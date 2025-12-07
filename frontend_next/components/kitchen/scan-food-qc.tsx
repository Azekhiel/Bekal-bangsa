"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Upload, CheckCircle2, AlertCircle, ScanLine, X, RotateCcw, Utensils, AlertTriangle, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

interface ScanResult {
  id: number
  image: string
  safetyStatus: "approved" | "rejected" | "pending"
  nutritionData: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  menuName?: string
  visualQuality?: string
  spoilageSigns?: string[]
  timestamp: string
}

export default function ScanFoodQC() {
  const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera")
  const [photo, setPhoto] = useState<string | null>(null)
  const [results, setResults] = useState<ScanResult[]>([])
  const [loading, setLoading] = useState(false)

  // Camera State
  const [cameraActive, setCameraActive] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Fix: Attach stream to video element when it becomes available and active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraActive])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    if (cameraActive) return

    setIsStartingCamera(true)
    try {
      let stream
      try {
        // Try environment (rear) camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
      } catch (err) {
        console.warn("Retrying with default camera...", err)
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        })
      }

      streamRef.current = stream
      setCameraActive(true)

    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera aktif.")
    } finally {
      setIsStartingCamera(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const photoData = canvasRef.current.toDataURL("image/jpeg")
        setPhoto(photoData)
        stopCamera()
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhoto(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const submitForAnalysis = async () => {
    if (!photo) return

    setLoading(true)
    try {
      const fetchRes = await fetch(photo)
      const blob = await fetchRes.blob()
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" })

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/kitchen/scan-food", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()

      const safetyStatus: "approved" | "rejected" | "pending" = data.is_safe === true
        ? "approved"
        : data.is_safe === false
          ? "rejected"
          : "pending"

      const nutritionData = {
        calories: parseInt(data.nutrition_estimate?.calories) || 0,
        protein: parseInt(data.nutrition_estimate?.protein) || 0,
        carbs: parseInt(data.nutrition_estimate?.carbs) || 0,
        fat: parseInt(data.nutrition_estimate?.fats || data.nutrition_estimate?.fat) || 0,
      }

      const newResult: ScanResult = {
        id: results.length + 1,
        image: photo,
        safetyStatus,
        nutritionData,
        menuName: data.menu_name,
        visualQuality: data.visual_quality,
        spoilageSigns: data.spoilage_signs && data.spoilage_signs.length > 0 ? data.spoilage_signs : undefined,
        timestamp: new Date().toLocaleString("id-ID"),
      }
      setResults([newResult, ...results])
      setPhoto(null)
    } catch (error) {
      console.error("Error submitting for analysis:", error)
      alert("Gagal mengirim untuk analisis")
    } finally {
      setLoading(false)
    }
  }

  const resetCapture = () => {
    setPhoto(null)
    // Optionally restart camera if needed, but user might want to review results
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/20 p-3.5 rounded-xl backdrop-blur-md shadow-inner">
            <ScanLine className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Food Quality Control</h1>
            <p className="text-emerald-100/90 mt-1 max-w-xl text-sm">
              Scan makanan yang sudah dimasak untuk verifikasi keamanan, nutrisi, dan kualitas visual sebelum disajikan.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Input Area */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-0">
              {/* Custom Tabs */}
              <div className="flex bg-slate-100/80 p-1 rounded-lg">
                <button
                  onClick={() => { setActiveTab("camera"); stopCamera() }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-300 ${activeTab === "camera"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                  <Camera className="w-4 h-4" /> Kamera
                </button>
                <button
                  onClick={() => { setActiveTab("upload"); stopCamera() }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-300 ${activeTab === "upload"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                  <Upload className="w-4 h-4" /> Upload
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Camera Tab */}
              {activeTab === "camera" && (
                <div className="space-y-4">
                  {!cameraActive && !photo ? (
                    <div
                      onClick={!isStartingCamera ? startCamera : undefined}
                      className={`aspect-[3/4] bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-colors group ${isStartingCamera ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      <div className={`bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform ${isStartingCamera ? 'animate-pulse' : ''}`}>
                        <Camera className={`w-8 h-8 text-emerald-500 ${isStartingCamera ? 'opacity-50' : ''}`} />
                      </div>
                      <span className="font-semibold text-slate-600 group-hover:text-emerald-700">
                        {isStartingCamera ? "Menghubungkan..." : "Mulai Kamera"}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        {isStartingCamera ? "Mohon tunggu sebentar" : "Klik untuk akses kamera"}
                      </span>
                    </div>
                  ) : !photo ? (
                    <div className="relative rounded-xl overflow-hidden shadow-md aspect-[3/4] bg-black">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                        <Button
                          onClick={stopCamera}
                          size="icon"
                          variant="secondary"
                          className="rounded-full h-12 w-12 bg-white/20 backdrop-blur border border-white/30 text-white hover:bg-white/30"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                        <Button
                          onClick={capturePhoto}
                          className="rounded-full h-16 w-16 bg-white border-4 border-emerald-500 hover:scale-105 transition-transform shadow-lg"
                        >
                          <div className="w-12 h-12 bg-emerald-600 rounded-full" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === "upload" && !photo && (
                <div
                  className="aspect-[3/4] border-2 border-dashed border-emerald-200 bg-emerald-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-300 group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:shadow-md transition-shadow">
                    <Upload className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="font-bold text-slate-700">Upload Foto</p>
                  <p className="text-xs text-slate-400 mt-1">JPG / PNG Max 5MB</p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
              )}

              {/* Photo Preview & Action */}
              {photo && (
                <div className="space-y-4">
                  <div className="aspect-[3/4] relative rounded-xl overflow-hidden shadow-md border-2 border-slate-100 group">
                    <Image src={photo} alt="Preview" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="secondary" onClick={resetCapture} className="h-8">
                        <RotateCcw className="w-3 h-3 mr-2" /> Foto Ulang
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={submitForAnalysis}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-lg shadow-emerald-600/20"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <ScanLine className="w-4 h-4 animate-pulse" /> Menganalisis...
                      </span>
                    ) : (
                      "Analisis Sekarang"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Results List */}
        <div className="lg:col-span-2 space-y-4">
          {results.length === 0 ? (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <ShieldCheck className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-medium text-lg">Menunggu Hasil Scan</p>
              <p className="text-sm opacity-70 mt-1 max-w-xs text-center">Hasil analisis kualitas makanan akan muncul di sini secara real-time.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between pb-2">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Riwayat Pemeriksaan
                </h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                  {results.length} Item
                </span>
              </div>

              {results.map((result) => (
                <Card key={result.id} className="overflow-hidden border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Image Section */}
                      <div className="w-full md:w-32 h-32 relative bg-slate-100 flex-shrink-0">
                        <Image src={result.image} alt={result.menuName || "Scan"} fill className="object-cover" />
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-slate-800 text-lg">{result.menuName || "Makanan Terdeteksi"}</h4>
                            <p className="text-xs text-slate-400">{result.timestamp}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${result.safetyStatus === "approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : result.safetyStatus === "rejected"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                            }`}>
                            {result.safetyStatus === "approved" ? "SAFE TO SERVE" : result.safetyStatus === "rejected" ? "REJECTED" : "PENDING"}
                          </div>
                        </div>

                        {/* Grid: 2 Columns on Desktop */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">

                          {/* Col 1: Nutrition Info (Grid of 4) */}
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <h5 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Estimasi Nutrisi</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <span className="text-xs text-slate-400 block">Kalori</span>
                                <span className="text-sm font-bold text-slate-700">{result.nutritionData.calories} kkal</span>
                              </div>
                              <div>
                                <span className="text-xs text-slate-400 block">Protein</span>
                                <span className="text-sm font-bold text-slate-700">{result.nutritionData.protein}g</span>
                              </div>
                              <div>
                                <span className="text-xs text-slate-400 block">Karbo</span>
                                <span className="text-sm font-bold text-slate-700">{result.nutritionData.carbs}g</span>
                              </div>
                              <div>
                                <span className="text-xs text-slate-400 block">Lemak</span>
                                <span className="text-sm font-bold text-slate-700">{result.nutritionData.fat}g</span>
                              </div>
                            </div>
                          </div>

                          {/* Col 2: Quality & Issues */}
                          <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 flex flex-col justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-emerald-700 mb-1 uppercase tracking-wide">Kualitas Visual</h5>
                              <p className="text-sm text-emerald-900 leading-relaxed text-wrap">
                                {result.visualQuality || "Tidak ada data kualitas visual."}
                              </p>
                            </div>

                            {result.spoilageSigns && (
                              <div className="mt-3 pt-3 border-t border-emerald-200">
                                <div className="flex items-start gap-2 text-red-600">
                                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-xs font-bold block">Potensi Isu:</span>
                                    <span className="text-xs leading-tight block">{result.spoilageSigns.join(", ")}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas Hidden */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
