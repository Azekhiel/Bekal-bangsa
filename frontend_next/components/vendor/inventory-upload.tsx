"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Camera, MapPin, AlertCircle, X, RotateCcw, CheckCircle2, Trash2, Plus, ScanLine, Store } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

interface SupplyItem {
  name: string
  qty: number
  unit: string
  freshness: string
  expiry_days: number
  note?: string
  owner_name: string
  location: string
  latitude?: number
  longitude?: number
  photo_url?: string
}

export default function InventoryUpload() {
  const [uploadMode, setUploadMode] = useState<"camera" | "upload">("camera")
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [detectedItems, setDetectedItems] = useState<SupplyItem[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)

  // Camera state & Refs
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  // Critical Fix: Attach stream to video element once it renders
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

  const handleGetLocation = () => {
    setLoadingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
          setLoadingLocation(false)
        },
        (error) => {
          if (!error.message.includes("secure origin")) {
            console.error("Error getting location:", error)
          }
          // Fallback to Monas, Jakarta for Demo/Dev
          setLocation({
            lat: -6.175392,
            lon: 106.827153,
          })
          setLoadingLocation(false)
        },
      )
    }
  }

  const startCamera = async () => {
    if (cameraActive) return

    setIsStartingCamera(true)
    try {
      // Try asking for rear camera first (mobile)
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
      } catch (err) {
        console.warn("Retrying with default camera...", err)
        // Fallback to any available camera (laptop/desktop)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        })
      }

      // Store stream in ref FIRST
      streamRef.current = stream
      // Then active UI to render <video>
      setCameraActive(true)

    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera aktif atau gunakan fitur Upload File.")
    } finally {
      setIsStartingCamera(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks()
      tracks.forEach((track) => track.stop())
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
        const imageData = canvasRef.current.toDataURL("image/jpeg")
        setPreviewUrl(imageData)
        stopCamera()
        handleAnalyzePhoto(imageData)
      }
    }
  }

  const handleAnalyzePhoto = async (imageData: string) => {
    setAnalyzing(true)
    try {
      const response = await fetch(imageData)
      const blob = await response.blob()
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })

      setUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const uploadData = await uploadRes.json()

      const analyzeFormData = new FormData()
      analyzeFormData.append("file", file)

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        body: analyzeFormData,
      })
      const analyzeData = await analyzeRes.json()

      if (analyzeData.items) {
        const itemsWithLocation = analyzeData.items.map((item: SupplyItem) => ({
          ...item,
          owner_name: "UMKM Vendor",
          location: location ? `Lat: ${location.lat}, Lon: ${location.lon}` : "Tidak terdeteksi",
          latitude: location?.lat,
          longitude: location?.lon,
          photo_url: uploadData.url,
        }))
        setDetectedItems(itemsWithLocation)
      } else {
        console.warn("No items detected or invalid format:", analyzeData)
        alert("AI tidak dapat mendeteksi item. Coba foto yang lebih jelas.")
      }
    } catch (error) {
      console.error("Error analyzing photo:", error)
      alert("Gagal menganalisis foto")
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string)
      handleAnalyzePhotoFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyzePhotoFile = async (file: File) => {
    setAnalyzing(true)
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const uploadData = await uploadRes.json()

      const analyzeFormData = new FormData()
      analyzeFormData.append("file", file)

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        body: analyzeFormData,
      })
      const analyzeData = await analyzeRes.json()

      if (analyzeData.items) {
        const itemsWithLocation = analyzeData.items.map((item: SupplyItem) => ({
          ...item,
          owner_name: "UMKM Vendor",
          location: location ? `Lat: ${location.lat}, Lon: ${location.lon}` : "Tidak terdeteksi",
          latitude: location?.lat,
          longitude: location?.lon,
          photo_url: uploadData.url,
        }))
        setDetectedItems(itemsWithLocation)
      } else {
        console.warn("No items detected or invalid format:", analyzeData)
        alert("AI tidak dapat mendeteksi item. Coba foto yang lebih jelas.")
      }
    } catch (error) {
      console.error("Error uploading/analyzing:", error)
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const handleSubmit = async () => {
    if (detectedItems.length === 0) return

    try {
      const response = await fetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(detectedItems),
      })
      await response.json()
      alert("Persediaan berhasil disimpan!")
      setDetectedItems([])
      setPreviewUrl(null)
    } catch (error) {
      console.error("Error submitting supplies:", error)
      alert("Gagal menyimpan persediaan")
    }
  }

  const resetCapture = () => {
    setPreviewUrl(null)
    setDetectedItems([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const updateItem = (index: number, field: keyof SupplyItem, value: any) => {
    const newItems = [...detectedItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setDetectedItems(newItems)
  }

  const addManualItem = () => {
    setDetectedItems([
      ...detectedItems,
      {
        name: "",
        qty: 1,
        unit: "kg",
        freshness: "Segar",
        expiry_days: 7,
        owner_name: "UMKM Vendor",
        location: location ? `Lat: ${location.lat}, Lon: ${location.lon}` : "Tidak terdeteksi",
        latitude: location?.lat,
        longitude: location?.lon,
        photo_url: previewUrl || undefined,
      },
    ])
  }

  const removeManualItem = (index: number) => {
    const newItems = [...detectedItems]
    newItems.splice(index, 1)
    setDetectedItems(newItems)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Section with Integrated Location */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3.5 rounded-xl backdrop-blur-md shadow-inner">
              <ScanLine className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Upload Stok Persediaan</h1>
              <p className="text-amber-100/90 mt-1 max-w-xl text-sm">
                Foto bahan baku Anda, AI akan otomatis mendeteksi item, kesegaran, dan estimasi kadaluwarsa.
              </p>
            </div>
          </div>

          {/* Location Badge */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5 flex items-center pr-4 border border-white/20">
            <Button
              size="sm"
              onClick={handleGetLocation}
              disabled={loadingLocation}
              variant="ghost"
              className="text-white hover:bg-white/20 h-8 px-3 rounded-md mr-2"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {loadingLocation ? "Mencari..." : location ? "Update Lokasi" : "Set Lokasi"}
            </Button>
            <div className="text-xs font-medium text-amber-50">
              {location ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  GPS Terkunci
                </span>
              ) : (
                <span className="opacity-70">Lokasi belum diset</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input Methods */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="pb-0">
              <div className="flex bg-slate-100/80 p-1 rounded-lg">
                <button
                  onClick={() => { setUploadMode("camera"); stopCamera() }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-300 ${uploadMode === "camera"
                      ? "bg-white text-amber-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                  <Camera className="w-4 h-4" /> Kamera
                </button>
                <button
                  onClick={() => { setUploadMode("upload"); stopCamera() }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all duration-300 ${uploadMode === "upload"
                      ? "bg-white text-amber-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    }`}
                >
                  <Upload className="w-4 h-4" /> Upload
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Camera Mode */}
              {uploadMode === "camera" && (
                <div className="space-y-4">
                  {!cameraActive ? (
                    <div
                      onClick={!isStartingCamera ? startCamera : undefined}
                      className={`aspect-video bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-colors group ${isStartingCamera ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      <div className={`bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform ${isStartingCamera ? 'animate-pulse' : ''}`}>
                        <Camera className={`w-8 h-8 text-amber-500 ${isStartingCamera ? 'opacity-50' : ''}`} />
                      </div>
                      <span className="font-semibold text-slate-600 group-hover:text-amber-700">
                        {isStartingCamera ? "Menghubungkan..." : "Mulai Kamera"}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        {isStartingCamera ? "Mohon izinkan akses kamera" : "Klik untuk akses kamera"}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-4">
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
                            className="rounded-full h-16 w-16 bg-white border-4 border-amber-500 hover:scale-105 transition-transform shadow-lg"
                          >
                            <div className="w-12 h-12 bg-amber-600 rounded-full" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Mode */}
              {uploadMode === "upload" && (
                <div
                  className="aspect-[3/4] border-2 border-dashed border-amber-200 bg-amber-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-amber-50 hover:border-amber-400 transition-all duration-300 group relative"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:shadow-md transition-shadow">
                    <Upload className="w-8 h-8 text-amber-500" />
                  </div>
                  <p className="font-bold text-slate-700">Upload Foto</p>
                  <p className="text-xs text-slate-400 mt-1">JPG / PNG Max 5MB</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading || analyzing}
                  />

                  {(uploading || analyzing) && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-sm font-medium text-amber-700">Memproses AI...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Status Alerts */}
              {analyzing && !uploadMode.includes("upload") && (
                <Alert className="mt-4 bg-amber-50 border-amber-200">
                  <ScanLine className="h-4 w-4 text-amber-600 animate-pulse" />
                  <AlertDescription className="text-amber-700 text-xs">Sedang menganalisis gambar...</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Preview Section */}
          {previewUrl && (
            <Card className="overflow-hidden border shadow-sm">
              <CardContent className="p-0 relative">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Button size="sm" variant="secondary" onClick={resetCapture} className="h-7 text-xs bg-white/90 hover:bg-white text-slate-700 shadow-sm backdrop-blur">
                    <RotateCcw className="w-3 h-3 mr-1.5" /> Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Results List */}
        <div className="lg:col-span-2 space-y-4">
          {detectedItems.length === 0 ? (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <Store className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Belum ada item terdeteksi</p>
              <p className="text-sm opacity-70 mt-1 max-w-xs text-center">Silakan ambil foto atau upload gambar persediaan untuk memulai analisis AI</p>
              <Button onClick={addManualItem} variant="link" className="text-amber-600 mt-2">
                + Input Manual
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  Hasil Analisis <span className="text-slate-400 font-normal text-base">({detectedItems.length} Item)</span>
                </h2>
                <Button onClick={addManualItem} size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                  <Plus className="w-4 h-4 mr-2" /> Tambah Manual
                </Button>
              </div>

              <div className="space-y-4">
                {detectedItems.map((item, idx) => (
                  <Card key={idx} className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow group">
                    <CardContent className="p-5 relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 text-slate-300 hover:text-red-500 hover:bg-red-50"
                        onClick={() => removeManualItem(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Main Info */}
                        <div className="md:col-span-5 space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 uppercase tracking-wide">Nama Barang</Label>
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(idx, "name", e.target.value)}
                              className="font-semibold text-lg border-slate-200 focus:border-amber-400 focus:ring-amber-400/20"
                              placeholder="Contoh: Beras Premium"
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="space-y-1.5 flex-1">
                              <Label className="text-xs text-slate-500">Jumlah</Label>
                              <Input
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateItem(idx, "qty", parseFloat(e.target.value) || 0)}
                                className="border-slate-200"
                              />
                            </div>
                            <div className="space-y-1.5 w-24">
                              <Label className="text-xs text-slate-500">Satuan</Label>
                              <Input
                                value={item.unit}
                                onChange={(e) => updateItem(idx, "unit", e.target.value)}
                                className="border-slate-200 bg-slate-50"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Health Info */}
                        <div className="md:col-span-7 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">Kondisi Fisik</Label>
                              <Select value={item.freshness} onValueChange={(val: string) => updateItem(idx, "freshness", val)}>
                                <SelectTrigger className={`border-slate-200 ${item.freshness === "Segar" ? "text-emerald-600 bg-emerald-50/50" :
                                    item.freshness === "Sedang" ? "text-amber-600 bg-amber-50/50" : "text-red-600 bg-red-50/50"
                                  }`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Segar">Segar (Bagus)</SelectItem>
                                  <SelectItem value="Sedang">Cukup</SelectItem>
                                  <SelectItem value="Buruk">Buruk / Layu</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">Sisa Umur (Hari)</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  value={item.expiry_days}
                                  onChange={(e) => updateItem(idx, "expiry_days", parseInt(e.target.value) || 0)}
                                  className="border-slate-200 pl-8"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                  <RotateCcw className="w-3 h-3" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500">Catatan Tambahan</Label>
                            <Input
                              value={item.note || ""}
                              onChange={(e) => updateItem(idx, "note", e.target.value)}
                              className="text-sm text-slate-600 bg-slate-50 border-slate-100 placeholder:text-slate-300"
                              placeholder="Tambahkan catatan khusus..."
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20 px-8"
                >
                  Simpan ke Inventaris
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden canvas for camera styling */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
