"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import NotificationList from "./notification-list"

export default function NotificationBell() {
    const [count, setCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

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
                <NotificationList onCountChange={setCount} />
            </PopoverContent>
        </Popover>
    )
}
