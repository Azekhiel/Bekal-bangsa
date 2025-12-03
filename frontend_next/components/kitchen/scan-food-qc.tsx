"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Camera, Upload, CheckCircle, AlertCircle } from "lucide-react"

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
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [results, setResults] = useState<ScanResult[]>([])
  const [loading, setLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Fix: Attach stream to video element when it becomes available
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      setStream(mediaStream)
      // videoRef.current is null here because the video element hasn't rendered yet
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Tidak dapat mengakses kamera")
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
      // Do not clear photo here, as it's called after capture
    }
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
      // Convert base64 to blob
      // Convert base64 to blob
      const fetchRes = await fetch(photo)
      const blob = await fetchRes.blob()
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" })

      const formData = new FormData()
      formData.append("file", file)

      console.log("Sending file to backend...", file.size, file.type) // Debug log

      const response = await fetch("/api/kitchen/scan-food", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()

      console.log("Backend response:", data)

      // Map analyze_cooked_meal response to frontend state
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

  return (
    <div className="space-y-6">
      {/* Scan Section */}
      <Card className="border-0 shadow-md overflow-hidden py-0 gap-0">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-emerald-50 border-b border-primary/20 py-6">
          <CardTitle>QC Scan Makanan</CardTitle>
          <CardDescription>Scan makanan untuk verifikasi keamanan dan nutrisi</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => {
                setActiveTab("camera")
                startCamera()
              }}
              className={`flex items-center gap-2 ${activeTab === "camera"
                ? "bg-primary text-white"
                : "bg-white text-foreground border border-border hover:bg-slate-50"
                }`}
            >
              <Camera className="w-4 h-4" />
              Ambil Foto
            </Button>
            <Button
              onClick={() => {
                setActiveTab("upload")
                stopCamera()
              }}
              className={`flex items-center gap-2 ${activeTab === "upload"
                ? "bg-primary text-white"
                : "bg-white text-foreground border border-border hover:bg-slate-50"
                }`}
            >
              <Upload className="w-4 h-4" />
              Upload File
            </Button>
          </div>

          {/* Camera Tab */}
          {activeTab === "camera" && (
            <div className="space-y-4">
              {stream && !photo ? (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black border-2 border-primary"
                  />
                  <div className="flex gap-2">
                    <Button onClick={capturePhoto} className="flex-1 bg-primary hover:bg-primary/90 text-white">
                      <Camera className="w-4 h-4 mr-2" />
                      Ambil Foto
                    </Button>
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
                    >
                      Batalkan
                    </Button>
                  </div>
                </div>
              ) : !photo ? (
                <Button onClick={startCamera} className="w-full bg-primary hover:bg-primary/90 text-white py-6">
                  <Camera className="w-5 h-5 mr-2" />
                  Buka Kamera
                </Button>
              ) : (
                <div className="space-y-4">
                  <img
                    src={photo || "/placeholder.svg"}
                    alt="Captured"
                    className="w-full rounded-lg border-2 border-primary"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => setPhoto(null)} variant="outline" className="flex-1">
                      Ambil Ulang
                    </Button>
                    <Button
                      onClick={submitForAnalysis}
                      disabled={loading}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white"
                    >
                      {loading ? "Menganalisis..." : "Analisis"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === "upload" && !photo && (
            <div className="space-y-4">
              <label className="block">
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center cursor-pointer hover:bg-primary/5 transition-colors">
                  <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-semibold text-foreground">Klik untuk upload foto</p>
                  <p className="text-sm text-muted-foreground">atau drag and drop</p>
                </div>
                <Input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          {/* Upload Preview */}
          {activeTab === "upload" && photo && (
            <div className="space-y-4">
              <img
                src={photo || "/placeholder.svg"}
                alt="Uploaded"
                className="w-full rounded-lg border-2 border-primary"
              />
              <div className="flex gap-2">
                <Button onClick={() => setPhoto(null)} variant="outline" className="flex-1">
                  Pilih Ulang
                </Button>
                <Button
                  onClick={submitForAnalysis}
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? "Menganalisis..." : "Analisis"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Results */}
      {results.length > 0 && (
        <Card className="border-0 shadow-md overflow-hidden py-0 gap-0">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-emerald-50 border-b border-primary/20 py-6">
            <CardTitle>Hasil Pemeriksaan</CardTitle>
            <CardDescription>Riwayat scan QC makanan</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 pb-6 space-y-4">
            {results.map((result) => (
              <div key={result.id} className="border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <img
                    src={result.image || "/placeholder.svg"}
                    alt="Scan result"
                    className="w-20 h-20 rounded-lg object-cover border border-border"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {result.safetyStatus === "approved" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : result.safetyStatus === "rejected" ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      <span className="font-semibold text-foreground">
                        {result.safetyStatus === "approved"
                          ? "Disetujui"
                          : result.safetyStatus === "rejected"
                            ? "Ditolak"
                            : "Pending"}
                      </span>
                    </div>
                    {result.menuName && (
                      <p className="text-sm font-medium text-foreground mb-1">{result.menuName}</p>
                    )}
                    {result.visualQuality && (
                      <p className="text-xs text-muted-foreground mb-1">🎨 {result.visualQuality}</p>
                    )}
                    {result.spoilageSigns && result.spoilageSigns.length > 0 && (
                      <p className="text-xs text-red-600 mb-1">⚠️ {result.spoilageSigns.join(", ")}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{result.timestamp}</p>
                  </div>
                </div>

                {/* Nutrition Info */}
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="bg-primary/10 p-2 rounded text-center">
                    <p className="text-xs text-muted-foreground">Kalori</p>
                    <p className="font-semibold text-foreground">{result.nutritionData.calories}</p>
                  </div>
                  <div className="bg-secondary/10 p-2 rounded text-center">
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="font-semibold text-foreground">{result.nutritionData.protein}g</p>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded text-center">
                    <p className="text-xs text-muted-foreground">Karbo</p>
                    <p className="font-semibold text-foreground">{result.nutritionData.carbs}g</p>
                  </div>
                  <div className="bg-orange-500/10 p-2 rounded text-center">
                    <p className="text-xs text-muted-foreground">Lemak</p>
                    <p className="font-semibold text-foreground">{result.nutritionData.fat}g</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
