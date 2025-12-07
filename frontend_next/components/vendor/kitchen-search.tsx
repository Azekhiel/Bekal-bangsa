"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Navigation, Building2, Phone } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SPPGLocation {
  id: number
  name: string
  address: string
  lat: number
  long: number
  phone: string
  distance_km: number
}

export default function KitchenSearch() {
  const [searchResults, setSearchResults] = useState<SPPGLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [searched, setSearched] = useState(false)

  // Manual Input State
  const [manualLat, setManualLat] = useState("-6.175392")
  const [manualLong, setManualLong] = useState("106.827153")
  const [useManual, setUseManual] = useState(false)

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
          setManualLat(position.coords.latitude.toString())
          setManualLong(position.coords.longitude.toString())
        },
        (error) => {
          if (!error.message.includes("secure origin")) {
            console.error("Error getting location:", error)
          }
          // Fallback to Monas, Jakarta
          setLocation({
            lat: -6.175392,
            lon: 106.827153,
          })
        },
      )
    }
  }

  const handleSearch = async () => {
    // Use manual coordinates if toggled or if GPS not active
    let lat = -6.175392
    let lon = 106.827153

    if (useManual) {
      lat = parseFloat(manualLat)
      lon = parseFloat(manualLong)
    } else if (location) {
      lat = location.lat
      lon = location.lon
    }

    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        long: lon.toString(),
      })

      const response = await fetch(`/api/sppg/search?${params}`, {
        method: "GET",
      })
      const data = await response.json()
      setSearchResults(data.data || [])
    } catch (error) {
      console.error("Error searching SPPG:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Cari SPPG Terdekat
          </CardTitle>
          <CardDescription>Temukan Kitchen Hub (Dapur Umum) terdekat untuk menyetor bahan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Latitude</label>
              <input
                type="text"
                value={manualLat}
                onChange={(e) => {
                  setManualLat(e.target.value)
                  setUseManual(true)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Longitude</label>
              <input
                type="text"
                value={manualLong}
                onChange={(e) => {
                  setManualLong(e.target.value)
                  setUseManual(true)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleGetLocation}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Navigation className="w-4 h-4" />
              {location ? "Lokasi Terdeteksi" : "Aktifkan GPS"}
            </Button>

            <Button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading ? "Mencari..." : "Cari SPPG Terdekat"}
            </Button>
          </div>

          {location && !useManual && (
            <p className="text-sm text-muted-foreground">
              GPS: {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Pencarian ({searchResults.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchResults.map((item) => (
                <div key={item.id} className="border border-border rounded-lg p-4 hover:bg-muted transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <p className="font-semibold text-foreground">{item.name}</p>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6 mb-2">{item.address}</p>
                      <div className="flex items-center gap-2 ml-6">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{item.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">{item.distance_km.toFixed(1)} km</p>
                      <span className="text-xs text-muted-foreground">dari lokasi anda</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 justify-end">
                    <Button size="sm" variant="outline">Lihat Peta</Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Hubungi</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && searched && searchResults.length === 0 && (
        <Alert>
          <AlertDescription>Tidak ditemukan SPPG di sekitar lokasi ini.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
