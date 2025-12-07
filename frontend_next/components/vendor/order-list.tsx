"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface Order {
  id: number
  supply_name?: string
  qty_ordered: number
  buyer_name: string
  status: "pending" | "confirmed" | "completed"
  created_at: string
  // Data dari join
  supplies?: {
    item_name: string
    unit: string
  }
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    try {
      // 1. AMBIL TOKEN (PERBAIKAN UTAMA)
      const token = localStorage.getItem("token")
      if (!token) return

      // 2. KIRIM HEADER AUTH
      const response = await fetch("/api/orders/umkm", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders)
      } else {
        setOrders([])
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // Jangan lupa token disini juga
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchOrders()
      }
    } catch (error) {
      console.error("Error updating order:", error)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200"
      case "confirmed": return "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200"
      case "completed": return "bg-green-100 text-green-800 hover:bg-green-200 border-green-200"
      default: return ""
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Memuat pesanan...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pesanan Masuk</CardTitle>
          <CardDescription>Daftar pesanan dari SPPG untuk persediaan Anda</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Tidak ada pesanan saat ini</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="border border-border rounded-lg p-4 space-y-3 bg-white shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {order.status === "confirmed" ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-yellow-500" />}
                        <p className="font-semibold text-foreground text-lg">
                          {order.supplies?.item_name || "Item"}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">Pembeli: <span className="font-medium text-black">{order.buyer_name}</span></p>
                      <p className="text-sm text-muted-foreground">Jumlah: <span className="font-medium text-black">{order.qty_ordered} {order.supplies?.unit}</span></p>
                    </div>

                    <Badge variant="outline" className={getStatusBadgeVariant(order.status)}>
                      {order.status === "pending" ? "Perlu Konfirmasi" :
                        order.status === "confirmed" ? "Siap Kirim" : "Selesai"}
                    </Badge>
                  </div>

                  {order.status === "pending" && (
                    <div className="flex gap-2 justify-end pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, "confirmed")}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Terima Pesanan
                      </Button>
                    </div>
                  )}

                  {order.status === "confirmed" && (
                    <div className="flex gap-2 justify-end pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, "completed")}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Tandai Terkirim
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}