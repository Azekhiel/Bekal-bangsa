"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Navigation, Search } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import dynamic from "next/dynamic"

// Dynamically import map to avoid SSR issues
const SatelliteMap = dynamic(() => import("@/components/common/satellite-map"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-lg" />
})

interface SppgLocation {
    id: number
    name: string
    address: string
    distance_km: number
    lat: number
    long: number
    phone: string
}

export default function SppgSearch() {
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<SppgLocation[]>([])
    const [locationError, setLocationError] = useState<string | null>(null)

    const handleSearchNearest = () => {
        setLoading(true)
        setLocationError(null)

        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser")
            setLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords
                    const response = await fetch(`/api/sppg/search?lat=${latitude}&long=${longitude}`)
                    const data = await response.json()

                    if (data.status === "success") {
                        setResults(data.data)
                    } else {
                        setLocationError("Gagal mencari SPPG terdekat")
                    }
                } catch (error) {
                    console.error("Error searching SPPG:", error)
                    setLocationError("Terjadi kesalahan koneksi")
                } finally {
                    setLoading(false)
                }
            },
            (error) => {
                if (!error.message.includes("secure origin")) {
                    console.error("Geolocation error:", error)
                }
                // Fallback to Monas, Jakarta for Demo/Dev
                const fallbackLat = -6.175392
                const fallbackLong = 106.827153

                // Auto-search with fallback
                fetch(`/api/sppg/search?lat=${fallbackLat}&long=${fallbackLong}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === "success") {
                            setResults(data.data)
                            setLocationError("Lokasi tidak terdeteksi (Non-HTTPS). Menggunakan lokasi default: Monas, Jakarta.")
                        }
                    })
                    .catch(() => setLocationError("Gagal mencari SPPG terdekat"))
                    .finally(() => setLoading(false))
            }
        )
    }

    const openGoogleMaps = (lat: number, long: number) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${long}`, "_blank")
    }

    // Prepare markers for the map
    const mapMarkers = results.map(sppg => ({
        id: sppg.id,
        lat: sppg.lat,
        long: sppg.long,
        title: sppg.name,
        description: sppg.address,
        distance_km: sppg.distance_km,
        type: "target" as const
    }))

    // Add user location if available (simulated or real)
    // For now we use the first result's logic or a default if results exist
    // Ideally we'd store the user's lat/long from the search
    // But since we don't persist it in state here, we can infer or just show targets

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    Cari SPPG Terdekat (Drop Point)
                </CardTitle>
                <CardDescription>
                    Temukan lokasi Kitchen Hub terdekat untuk mengantar stok bahan makanan Anda.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button
                    onClick={handleSearchNearest}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    {loading ? (
                        "Mencari Lokasi..."
                    ) : (
                        <>
                            <Search className="w-4 h-4 mr-2" />
                            Cari SPPG Terdekat
                        </>
                    )}
                </Button>

                {locationError && (
                    <Alert variant="destructive">
                        <AlertDescription>{locationError}</AlertDescription>
                    </Alert>
                )}

                {results.length > 0 && (
                    <div className="space-y-4 mt-4">
                        {/* Satellite Map Integration */}
                        <div className="rounded-lg overflow-hidden border border-border">
                            {/* Dynamic Import to avoid SSR issues with Leaflet if needed, 
                                 but our component handles it with useEffect check */}
                            <SatelliteMap
                                center={[results[0].lat, results[0].long]}
                                markers={mapMarkers}
                                height="300px"
                            />
                        </div>

                        <h3 className="text-sm font-medium text-muted-foreground">Hasil Pencarian:</h3>
                        {results.map((sppg) => (
                            <div key={sppg.id} className="border border-border rounded-lg p-4 hover:bg-muted transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="font-semibold text-foreground">{sppg.name}</p>
                                        <p className="text-sm text-muted-foreground">{sppg.address}</p>
                                        <p className="text-xs text-emerald-600 font-medium">{sppg.phone}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center justify-end gap-1 text-emerald-600 mb-2">
                                            <MapPin className="w-4 h-4" />
                                            <span className="font-bold">{sppg.distance_km} km</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openGoogleMaps(sppg.lat, sppg.long)}
                                            className="text-xs h-8"
                                        >
                                            <Navigation className="w-3 h-3 mr-1" />
                                            Rute
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
