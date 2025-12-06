"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-defaulticon-compatibility"
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css"
import { Button } from "@/components/ui/button"
import { Navigation } from "lucide-react"

interface LocationMarker {
    id: number | string
    lat: number
    long: number
    title: string
    description?: string
    distance_km?: number
    type: "user" | "target"
}

interface SatelliteMapProps {
    center: [number, number]
    zoom?: number
    markers: LocationMarker[]
    height?: string
}

// Helper to auto-fit bounds
function MapBounds({ markers }: { markers: LocationMarker[] }) {
    const map = useMap()

    useEffect(() => {
        if (markers.length > 0) {
            const bounds = markers.map((m) => [m.lat, m.long] as [number, number])
            map.fitBounds(bounds, { padding: [50, 50] })
        }
    }, [markers, map])

    return null
}

export default function SatelliteMap({ center, zoom = 13, markers, height = "300px" }: SatelliteMapProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return (
            <div
                className="w-full bg-muted animate-pulse flex items-center justify-center text-muted-foreground"
                style={{ height }}
            >
                Loading Map...
            </div>
        )
    }

    const openGoogleMaps = (lat: number, long: number) => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${long}`, "_blank")
    }

    return (
        <div className="w-full rounded-lg overflow-hidden border border-border shadow-md relative z-0">
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height, width: "100%" }}>
                {/* Esri World Imagery (Satellite) */}
                <TileLayer
                    attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                {/* Labels Overlay (Optional, makes it 'Hybrid') */}
                <TileLayer
                    attribution=""
                    url="https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}{r}.png"
                    opacity={0.6}
                />

                <MapBounds markers={markers} />

                {markers.map((marker) => (
                    <Marker key={marker.id} position={[marker.lat, marker.long]}>
                        <Popup>
                            <div className="p-1 min-w-[150px]">
                                <h3 className="font-bold text-sm mb-1">{marker.title}</h3>
                                {marker.description && <p className="text-xs text-muted-foreground mb-2">{marker.description}</p>}
                                {marker.distance_km !== undefined && (
                                    <p className="text-xs font-semibold text-emerald-600 mb-2">{marker.distance_km} km away</p>
                                )}
                                {marker.type === "target" && (
                                    <Button
                                        size="sm"
                                        className="w-full h-7 text-xs"
                                        onClick={() => openGoogleMaps(marker.lat, marker.long)}
                                    >
                                        <Navigation className="w-3 h-3 mr-1" />
                                        Rute
                                    </Button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
