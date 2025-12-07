"use client"

import { LogOut, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import NotificationBell from "@/components/notifications/notification-bell"

interface VendorNavbarProps {
  vendorName: string
  onLogout: () => void
  onMenuToggle: (open: boolean) => void
}

export default function VendorNavbar({ vendorName, onLogout, onMenuToggle }: VendorNavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => onMenuToggle(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-foreground">{vendorName}</p>
            <p className="text-xs text-muted-foreground">UMKM Vendor</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-emerald-800">
            {vendorName.charAt(0)}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
