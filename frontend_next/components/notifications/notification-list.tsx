"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Bell, X, ChefHat, Flame, ArrowRight, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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

export default function NotificationList({ onCountChange }: { onCountChange?: (count: number) => void }) {
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
                        item_name: item.item_name || item.name,
                        days_left: item.expiry_days,
                        quantity: item.quantity || item.qty,
                        unit: item.unit,
                        urgency: item.expiry_days <= 1 ? "critical" : item.expiry_days <= 3 ? "warning" : "info",
                    }))
                    setAlerts(formattedAlerts)
                    if (onCountChange) onCountChange(formattedAlerts.length)
                }

                if (data.rescue_menu) {
                    setRescueMenu(data.rescue_menu)
                }
            } catch (error) {
                console.error("Error fetching alerts:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchAlerts()
        const interval = setInterval(fetchAlerts, 30000)
        return () => clearInterval(interval)
    }, [onCountChange])

    const dismissAlert = (id: number) => {
        const newAlerts = alerts.filter((a) => a.id !== id)
        setAlerts(newAlerts)
        if (onCountChange) onCountChange(newAlerts.length)
    }

    const markAllRead = () => {
        setAlerts([])
        if (onCountChange) onCountChange(0)
    }

    const getAlertColor = (urgency: string) => {
        switch (urgency) {
            case "critical":
                return "bg-red-100 border-l-4 border-red-600 shadow-sm"
            case "warning":
                return "bg-amber-100 border-l-4 border-amber-600 shadow-sm"
            case "info":
                return "bg-blue-50 border-l-4 border-blue-500"
            default:
                return "bg-muted"
        }
    }

    if (loading) {
        return <div className="p-4 text-center text-sm text-muted-foreground">Memuat notifikasi...</div>
    }

    if (alerts.length === 0 && !rescueMenu) {
        return (
            <div className="p-8 text-center flex flex-col items-center gap-2 text-muted-foreground">
                <Bell className="w-8 h-8 opacity-20" />
                <p className="text-sm">Tidak ada notifikasi baru</p>
            </div>
        )
    }

    return (
        <div className="w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-semibold">Notifikasi</h4>
                {alerts.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead} className="h-auto p-0 text-xs text-muted-foreground hover:text-primary">
                        <CheckCheck className="w-3 h-3 mr-1" />
                        Tandai sudah dibaca
                    </Button>
                )}
            </div>

            <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-4">
                    {/* Rescue Menu Card */}
                    {rescueMenu && (
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-lg p-3 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="bg-orange-100 p-2 rounded-full">
                                    <Flame className="w-4 h-4 text-orange-600" />
                                </div>
                                <div className="flex-1">
                                    <h5 className="font-semibold text-sm text-orange-900">Rekomendasi Penyelamatan</h5>
                                    <p className="text-xs text-orange-700 mt-1 line-clamp-2">{rescueMenu.description}</p>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm" variant="outline" className="w-full mt-3 bg-white/50 border-orange-200 hover:bg-white text-orange-800 text-xs h-8">
                                                Lihat Resep <ArrowRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2 text-xl">
                                                    <Flame className="w-5 h-5 text-orange-500" />
                                                    {rescueMenu.menu_name}
                                                </DialogTitle>
                                                <DialogDescription>
                                                    {rescueMenu.description}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid md:grid-cols-2 gap-6 py-4">
                                                <div>
                                                    <h4 className="font-semibold mb-2 text-sm">Bahan-bahan:</h4>
                                                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                        {rescueMenu.ingredients_needed.map((ing, i) => (
                                                            <li key={i}>{ing}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold mb-2 text-sm">Cara Masak:</h4>
                                                    <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                                                        {rescueMenu.cooking_steps.map((step, i) => (
                                                            <li key={i}>{step}</li>
                                                        ))}
                                                    </ol>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Alert List */}
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`rounded-lg p-4 relative group transition-all hover:shadow-md ${getAlertColor(alert.urgency)}`}
                        >
                            <div className="flex gap-4">
                                <div className={`p-2 rounded-full ${alert.urgency === 'critical' ? 'bg-red-200 text-red-700' :
                                        alert.urgency === 'warning' ? 'bg-amber-200 text-amber-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-base font-bold text-foreground">{alert.item_name}</p>
                                    <p className="text-sm font-medium text-slate-700 mt-1">
                                        {alert.quantity} {alert.unit} • <span className={`${alert.urgency === 'critical' ? 'text-red-700 font-bold' : ''}`}>{alert.days_left} hari tersisa</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => dismissAlert(alert.id)}
                                    className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 hover:bg-black/10 rounded-full transition-all"
                                >
                                    <X className="w-4 h-4 text-slate-600" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}
