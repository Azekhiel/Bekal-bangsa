"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Clock, Package, Truck, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

interface Order {
    id: number
    supply_name: string
    qty_ordered: number
    buyer_name: string
    status: "pending" | "confirmed" | "completed" | "cancelled"
    created_at: string
    supplies?: {
        item_name: string
        unit: string
        price_per_unit: number
    }
}

export default function VendorOrderHistory() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    const fetchOrders = async () => {
        try {
            const response = await fetch("/api/orders/umkm")
            const data = await response.json()
            setOrders(data.orders || [])
        } catch (error) {
            console.error("Error fetching orders:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrders()
    }, [])

    const updateStatus = async (orderId: number, newStatus: string) => {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })

            if (response.ok) {
                toast({
                    title: "Status Diperbarui",
                    description: `Pesanan berhasil diubah menjadi ${newStatus}.`,
                })
                fetchOrders() // Refresh list
            } else {
                throw new Error("Gagal update status")
            }
        } catch (error) {
            toast({
                title: "Gagal",
                description: "Terjadi kesalahan saat memperbarui status.",
                variant: "destructive",
            })
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "confirmed":
                return <Truck className="w-5 h-5 text-blue-500" />
            case "pending":
                return <Clock className="w-5 h-5 text-amber-500" />
            case "completed":
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case "cancelled":
                return <XCircle className="w-5 h-5 text-red-500" />
            default:
                return <AlertCircle className="w-5 h-5 text-muted-foreground" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-amber-100 text-amber-800 hover:bg-amber-200"
            case "confirmed":
                return "bg-blue-100 text-blue-800 hover:bg-blue-200"
            case "completed":
                return "bg-green-100 text-green-800 hover:bg-green-200"
            case "cancelled":
                return "bg-red-100 text-red-800 hover:bg-red-200"
            default:
                return "bg-slate-100 text-slate-800"
        }
    }

    if (loading) {
        return (
            <div className="p-8 text-center">
                <p className="text-muted-foreground">Memuat riwayat transaksi...</p>
            </div>
        )
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="bg-white border-b py-6">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Package className="w-6 h-6 text-primary" />
                    Riwayat Pesanan Masuk
                </CardTitle>
                <CardDescription>
                    Kelola pesanan yang masuk dari Dapur (Kitchen)
                </CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-slate-50/50 min-h-[500px]">
                {orders.length === 0 ? (
                    <Alert className="bg-white border-slate-200">
                        <AlertCircle className="h-4 w-4 text-slate-500" />
                        <AlertDescription className="text-slate-600">Belum ada pesanan masuk.</AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Order Info */}
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            {getStatusIcon(order.status)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-lg text-slate-800">
                                                    {order.supplies?.item_name || order.supply_name || "Item Tidak Diketahui"}
                                                </h4>
                                                <Badge variant="outline" className={getStatusBadge(order.status)}>
                                                    {order.status === "pending" ? "Perlu Konfirmasi" :
                                                        order.status === "confirmed" ? "Sedang Dikirim" :
                                                            order.status === "completed" ? "Selesai" : "Dibatalkan"}
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-slate-500 space-y-1">
                                                <p>Pemesan: <span className="font-medium text-slate-700">{order.buyer_name}</span></p>
                                                <p>Jumlah: <span className="font-medium text-slate-700">{order.qty_ordered} {order.supplies?.unit || "unit"}</span></p>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(order.created_at).toLocaleDateString("id-ID", {
                                                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        {order.status === "pending" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => updateStatus(order.id, "cancelled")}
                                                >
                                                    Tolak
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => updateStatus(order.id, "confirmed")}
                                                >
                                                    Terima & Kirim
                                                </Button>
                                            </>
                                        )}
                                        {order.status === "confirmed" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 border-green-200 hover:bg-green-50"
                                                onClick={() => updateStatus(order.id, "completed")}
                                            >
                                                Tandai Selesai
                                            </Button>
                                        )}
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
