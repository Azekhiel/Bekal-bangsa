"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Flame, Clock, AlertTriangle, CheckCircle } from "lucide-react"

interface InventoryItem {
  id: number
  item_name: string
  quantity: number
  unit: string
}

interface CookingSession {
  id: number
  menu_name: string
  qty_produced: number
  expiry_datetime: string
  status: string
  storage_tips: string
  nutrition_estimate: any
}

export default function CookingProduction() {
  const [menuName, setMenuName] = useState("")
  const [quantity, setQuantity] = useState("")
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedIngredients, setSelectedIngredients] = useState<number[]>([])
  const [sessions, setSessions] = useState<CookingSession[]>([])
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(new Date())

  // 1. Fetch Inventory & History on Mount
  useEffect(() => {
    fetchInventory()
    fetchHistory()

    // Update timer every minute
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const fetchInventory = async () => {
    try {
      const res = await fetch("/api/supplies")
      const data = await res.json()
      if (Array.isArray(data)) setInventory(data)
    } catch (e) {
      console.error("Failed to fetch inventory", e)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/kitchen/meals")
      const data = await res.json()
      if (Array.isArray(data)) setSessions(data)
    } catch (e) {
      console.error("Failed to fetch history", e)
    }
  }

  const handleStartCooking = async () => {
    if (!menuName || !quantity) return

    setLoading(true)
    try {
      const response = await fetch("/api/kitchen/cook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_name: menuName,
          qty_produced: Number.parseInt(quantity),
          ingredients_ids: selectedIngredients,
        }),
      })
      const data = await response.json()
      console.log("Cook response:", data)

      // Refresh history to show new meal
      fetchHistory()
      fetchInventory() // Refresh inventory (stock deducted)

      // Reset form
      setMenuName("")
      setQuantity("")
      setSelectedIngredients([])
    } catch (error) {
      console.error("Error starting cooking:", error)
      alert("Gagal memproses masakan")
    } finally {
      setLoading(false)
    }
  }

  const toggleIngredient = (id: number) => {
    setSelectedIngredients(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleServeMeal = async (id: number) => {
    try {
      const response = await fetch(`/api/kitchen/meals/${id}/serve`, {
        method: "PUT",
      })
      const data = await response.json()
      if (data.status === "success") {
        fetchHistory() // Refresh list
      }
    } catch (error) {
      console.error("Error serving meal:", error)
      alert("Gagal update status")
    }
  }

  // Helper: Calculate Time Left
  const getTimeLeft = (expiryStr: string) => {
    const expiry = new Date(expiryStr)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}j ${minutes}m`
  }

  const isCritical = (expiryStr: string) => {
    const expiry = new Date(expiryStr)
    const diff = expiry.getTime() - now.getTime()
    return diff < (1000 * 60 * 60) // Less than 1 hour
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left: Cooking Form */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Dapur Produksi
          </CardTitle>
          <CardDescription>Masak menu baru dan kurangi stok otomatis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nama Menu</Label>
            <Input
              placeholder="Contoh: Nasi Goreng Spesial"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Jumlah Porsi</Label>
            <Input
              type="number"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Pilih Bahan Baku (Opsional)</Label>
            <div className="border rounded-md p-3 h-48 overflow-y-auto space-y-2 bg-gray-50">
              {inventory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Stok kosong</p>
              ) : (
                inventory.map(item => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ing-${item.id}`}
                      checked={selectedIngredients.includes(item.id)}
                      onCheckedChange={() => toggleIngredient(item.id)}
                    />
                    <label
                      htmlFor={`ing-${item.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {item.item_name} ({item.quantity} {item.unit})
                    </label>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              *Bahan yang dipilih akan dikurangi dari stok
            </p>
          </div>

          <Button
            onClick={handleStartCooking}
            disabled={!menuName || !quantity || loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {loading ? "Sedang Memasak..." : "Mulai Masak"}
          </Button>
        </CardContent>
      </Card>

      {/* Right: Active Sessions (Real DB) */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Riwayat & Monitoring
        </h3>

        {sessions.filter(s => s.status !== 'served').length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
            Belum ada aktifitas memasak hari ini
          </div>
        ) : (
          sessions.filter(s => s.status !== 'served').map((session) => {
            const timeLeft = getTimeLeft(session.expiry_datetime)
            const critical = isCritical(session.expiry_datetime)
            const expired = timeLeft === "Expired"

            return (
              <Card key={session.id} className={`border-l-4 ${expired ? 'border-l-red-500 bg-red-50' : critical ? 'border-l-orange-500' : 'border-l-green-500'}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg">{session.menu_name}</h4>
                      <p className="text-sm text-muted-foreground">{session.qty_produced} porsi</p>
                    </div>
                    <Badge variant={expired ? "destructive" : critical ? "secondary" : "outline"} className={!expired && !critical ? "bg-green-100 text-green-800 border-green-200" : ""}>
                      {expired ? "BASI" : critical ? "SEGERA HABISKAN" : "FRESH"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div className="bg-white/50 p-2 rounded border">
                      <p className="text-xs text-muted-foreground">Sisa Waktu (Suhu Ruang)</p>
                      <p className={`font-mono font-bold text-lg ${critical || expired ? 'text-red-600' : 'text-green-600'}`}>
                        {timeLeft}
                      </p>
                    </div>
                    <div className="bg-white/50 p-2 rounded border">
                      <p className="text-xs text-muted-foreground">Tips Penyimpanan</p>
                      <p className="text-xs leading-tight mt-1">{session.storage_tips}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => handleServeMeal(session.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Telah Disajikan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
