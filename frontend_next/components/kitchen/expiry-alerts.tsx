import { useState, useEffect } from "react"
import { AlertTriangle, Bell, X, ChefHat, Flame, ArrowRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ExpiryAlert {
  id: number
  item_name: string
  days_left: number
  quantity: number
  unit: string
  urgency: "critical" | "warning" | "info"
}

interface RescueMenu {
  menu_name: string
  description: string
  ingredients_needed: string[]
  cooking_steps: string[]
  nutrition: {
    calories: string
    protein: string
  }
  reason: string
}

export default function ExpiryAlerts() {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([])
  const [rescueMenu, setRescueMenu] = useState<RescueMenu | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/notifications/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
        const data = await response.json()

        if (data.expiring_items) {
          const formattedAlerts = data.expiring_items.map((item: any, idx: number) => ({
            id: idx,
            item_name: item.item_name || item.name, // Handle inconsistent naming
            days_left: item.expiry_days,
            quantity: item.quantity || item.qty,
            unit: item.unit,
            urgency: item.expiry_days <= 1 ? "critical" : item.expiry_days <= 3 ? "warning" : "info",
          }))
          setAlerts(formattedAlerts)
        }

        if (data.rescue_menu) {
          setRescueMenu(data.rescue_menu)
        }
      } catch (error) {
        console.error("Error fetching alerts:", error)
        // Optional: Set UI state to show error if needed, but for alerts maybe just log it
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const dismissAlert = (id: number) => {
    setAlerts(alerts.filter((a) => a.id !== id))
  }

  const getAlertColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "border-l-4 border-l-red-500 bg-red-50"
      case "warning":
        return "border-l-4 border-l-yellow-500 bg-yellow-50"
      case "info":
        return "border-l-4 border-l-blue-500 bg-blue-50"
      default:
        return ""
    }
  }

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "URGENT - Akan kadaluarsa hari ini"
      case "warning":
        return "PERHATIAN - Akan kadaluarsa segera"
      case "info":
        return "INFO - Perhatian tanggal kadaluarsa"
      default:
        return ""
    }
  }

  if (loading) {
    return <p className="text-center text-muted-foreground text-sm py-2">Memuat notifikasi...</p>
  }

  if (alerts.length === 0) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <Bell className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">Tidak ada item yang akan segera kadaluarsa</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg p-4 flex justify-between items-start gap-4 ${getAlertColor(alert.urgency)}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold text-sm">{getUrgencyText(alert.urgency)}</span>
              </div>
              <p className="font-semibold text-foreground mb-1">{alert.item_name}</p>
              <p className="text-sm text-muted-foreground">
                {alert.quantity} {alert.unit} • {alert.days_left} hari tersisa
              </p>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="flex-shrink-0 hover:bg-black/10 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Rescue Menu Recommendation */}
      {rescueMenu && (
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-md">
              <ChefHat className="w-4 h-4 mr-2" />
              Lihat Rekomendasi Masakan Penyelamat
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Flame className="w-5 h-5 text-orange-500" />
                Rekomendasi Penyelamatan Stok
              </DialogTitle>
              <DialogDescription>
                Gunakan bahan-bahan yang akan kadaluarsa untuk membuat menu ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                <h3 className="font-bold text-lg text-orange-800 mb-1">{rescueMenu.menu_name}</h3>
                <p className="text-orange-700 text-sm">{rescueMenu.description}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded text-primary text-xs">1</span>
                    Bahan-bahan
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {rescueMenu.ingredients_needed.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded text-primary text-xs">2</span>
                    Nutrisi
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kalori</span>
                      <span className="font-medium">{rescueMenu.nutrition.calories}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Protein</span>
                      <span className="font-medium">{rescueMenu.nutrition.protein}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="bg-primary/10 p-1 rounded text-primary text-xs">3</span>
                  Cara Memasak
                </h4>
                <div className="space-y-3">
                  {rescueMenu.cooking_steps.map((step, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <p className="text-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-full" size="lg">
                <ChefHat className="w-4 h-4 mr-2" />
                Mulai Masak Sekarang
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
