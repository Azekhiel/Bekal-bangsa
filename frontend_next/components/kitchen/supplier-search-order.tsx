"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin, Search, ShoppingCart, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import dynamic from "next/dynamic"

// Dynamically import map to avoid SSR issues
const SatelliteMap = dynamic(() => import("@/components/common/satellite-map"), {
    ssr: false,
    loading: () => <div className="h-[350px] w-full bg-muted animate-pulse rounded-lg" />
})

interface SupplyItem {
    id: number
    name: string
    item_name?: string // Backend field
    qty: number
    quantity?: number // Backend field
    unit: string
    freshness: string
    quality_status?: string // Backend field
    expiry_days: number
    distance?: number
    distance_km?: number // Backend field
    owner_name: string
    location: string
    location_lat?: number
    location_long?: number
}

export default function SupplierSearchOrder() {
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<SupplyItem[]>([])
    const [loading, setLoading] = useState(false)
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)

    // Order State
    const [selectedItem, setSelectedItem] = useState<SupplyItem | null>(null)
    const [orderQty, setOrderQty] = useState(1)
    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
    const [orderProcessing, setOrderProcessing] = useState(false)

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    })
                },
                (error) => {
                    // Only log if it's NOT a secure origin error to avoid console noise
                    if (!error.message.includes("secure origin")) {
                        console.error("Error getting location:", error)
                    }
                    // Fallback to Monas, Jakarta for Demo/Dev
                    setLocation({
                        lat: -6.175392,
                        lon: 106.827153,
                    })
                },
            )
        }
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return

        setLoading(true)
        try {
            const params = new URLSearchParams({
                q: searchQuery,
                ...(location && { lat: location.lat.toString(), long: location.lon.toString() }),
            })

            const response = await fetch(`/api/suppliers/search?${params}`, {
                method: "GET",
            })
            const data = await response.json()
            console.log("[v0] Search results:", data)
            setSearchResults(data.data || [])
        } catch (error) {
            console.error("Error searching suppliers:", error)
        } finally {
            setLoading(false)
        }
    }

    const openOrderDialog = (item: SupplyItem) => {
        setSelectedItem(item)
        setOrderQty(1)
        setIsOrderDialogOpen(true)
    }

    const handlePlaceOrder = async () => {
        if (!selectedItem) return

        setOrderProcessing(true)
        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supply_id: selectedItem.id,
                    qty_ordered: orderQty,
                    buyer_name: "Dapur SPPG Pusat", // Hardcoded for now, ideally from auth
                }),
            })

            if (response.ok) {
                alert("Pesanan berhasil dibuat!")
                setIsOrderDialogOpen(false)
                setSelectedItem(null)
            } else {
                alert("Gagal membuat pesanan.")
            }
        } catch (error) {
            console.error("Error placing order:", error)
            alert("Terjadi kesalahan saat memesan.")
        } finally {
            setOrderProcessing(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-emerald-600" />
                        Cari Supplier & Bahan Baku
                    </CardTitle>
                    <CardDescription>Cari bahan segar dari UMKM terdekat untuk dapur Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Cari bahan (misal: Bawang, Telur, Bayam)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSearch}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {loading ? "Mencari..." : "Cari"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            {searchResults.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Hasil Pencarian ({searchResults.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Satellite Map Integration */}
                        <div className="rounded-lg overflow-hidden border border-border mb-6">
                            <SatelliteMap
                                center={
                                    searchResults[0].location_lat && searchResults[0].location_long
                                        ? [searchResults[0].location_lat, searchResults[0].location_long]
                                        : [-6.175392, 106.827153] // Default Monas
                                }
                                markers={searchResults.map(item => ({
                                    id: item.id,
                                    lat: item.location_lat || -6.175392, // Fallback if missing
                                    long: item.location_long || 106.827153,
                                    title: item.item_name || item.name,
                                    description: `Stok: ${item.quantity || item.qty} ${item.unit} • ${item.owner_name}`,
                                    distance_km: item.distance_km ?? item.distance,
                                    type: "target"
                                }))}
                                height="350px"
                            />
                        </div>

                        <div className="space-y-3">
                            {searchResults.map((item) => (
                                <div key={item.id} className="border border-border rounded-lg p-4 hover:bg-muted transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            {/* Backend returns: item_name, quantity, unit, quality_status, owner_name */}
                                            <p className="font-semibold text-foreground text-lg">{item.item_name || item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Stok: {item.quantity || item.qty} {item.unit} • {item.quality_status || item.freshness}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Supplier: <span className="font-medium text-emerald-700">{item.owner_name}</span>
                                            </p>
                                        </div>
                                        <div className="text-right space-y-2">
                                            {/* Backend returns: distance_km, expiry_days */}
                                            {(item.distance_km !== undefined || item.distance !== undefined) && (
                                                <div className="flex items-center justify-end gap-1 text-emerald-600">
                                                    <MapPin className="w-3 h-3" />
                                                    <p className="text-sm font-bold">
                                                        {(item.distance_km ?? item.distance ?? 0).toFixed(1)} km
                                                    </p>
                                                </div>
                                            )}
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded block text-center">
                                                Exp: {item.expiry_days} hari
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex justify-end">
                                        <Button
                                            onClick={() => openOrderDialog(item)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            Pesan Sekarang
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {!loading && searchResults.length === 0 && searchQuery && (
                <Alert>
                    <AlertDescription>Tidak ada hasil pencarian untuk "{searchQuery}"</AlertDescription>
                </Alert>
            )}

            {/* Order Dialog */}
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pesanan</DialogTitle>
                        <DialogDescription>
                            Anda akan memesan <strong>{selectedItem?.name}</strong> dari {selectedItem?.owner_name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="qty" className="text-right">
                                Jumlah
                            </Label>
                            <Input
                                id="qty"
                                type="number"
                                value={orderQty}
                                onChange={(e) => setOrderQty(Number(e.target.value))}
                                className="col-span-3"
                                min={1}
                                max={selectedItem?.qty}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground text-right">
                            Tersedia: {selectedItem?.qty} {selectedItem?.unit}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>Batal</Button>
                        <Button
                            onClick={handlePlaceOrder}
                            disabled={orderProcessing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {orderProcessing ? "Memproses..." : "Konfirmasi Pesanan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
