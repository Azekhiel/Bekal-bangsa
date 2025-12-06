"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import NotificationList, { ExpiryAlert, RescueMenu } from "./notification-list"

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)

    // State lifted from NotificationList
    const [alerts, setAlerts] = useState<ExpiryAlert[]>([])
    const [rescueMenu, setRescueMenu] = useState<RescueMenu | null>(null)
    const [loading, setLoading] = useState(true)

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

    useEffect(() => {
        // Fetch immediately on mount so badge shows up
        fetchAlerts()

        // Poll every 30s
        const interval = setInterval(fetchAlerts, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleDismiss = (id: number) => {
        setAlerts(prev => prev.filter(a => a.id !== id))
    }

    const handleMarkAllRead = () => {
        setAlerts([])
    }

    const count = alerts.length

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="lg"
                    className={`relative h-12 px-4 gap-2 border-2 transition-all duration-300 ${count > 0
                        ? "border-red-500/50 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-500"
                        : "border-border hover:bg-muted"
                        }`}
                >
                    <div className={`relative ${count > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""}`}>
                        <Bell className={`h-6 w-6 ${count > 0 ? "text-red-600 fill-red-600/20" : "text-muted-foreground"}`} />
                        {count > 0 && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-600 border-2 border-white animate-ping" />
                        )}
                        {count > 0 && (
                            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-600 border-2 border-white" />
                        )}
                    </div>

                    <div className="flex flex-col items-start text-left leading-none">
                        <span className={`font-bold text-sm ${count > 0 ? "text-red-700" : "text-foreground"}`}>
                            {count > 0 ? "Peringatan" : "Notifikasi"}
                        </span>
                        {count > 0 && (
                            <span className="text-[10px] font-medium text-red-600/80">
                                {count} Pesan Baru
                            </span>
                        )}
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 shadow-2xl border-2 border-slate-200" align="end">
                <NotificationList
                    alerts={alerts}
                    rescueMenu={rescueMenu}
                    loading={loading}
                    onDismiss={handleDismiss}
                    onMarkAllRead={handleMarkAllRead}
                />
            </PopoverContent>
        </Popover>
    )
}
