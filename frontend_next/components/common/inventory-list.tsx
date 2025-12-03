"use client"

import { useState, useEffect } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, AlertTriangle, CheckCircle } from "lucide-react"

interface InventoryItem {
    id: number
    item_name: string
    quantity: number
    unit: string
    expiry_days: number
    owner_name?: string
}

interface InventoryListProps {
    role: "vendor" | "kitchen"
}

export default function InventoryList({ role }: InventoryListProps) {
    const [items, setItems] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                // In a real app, we might filter by owner_id for vendor
                // For now, we fetch all supplies
                const response = await fetch("/api/supplies")
                const data = await response.json()

                if (Array.isArray(data)) {
                    setItems(data)
                }
            } catch (error) {
                console.error("Error fetching inventory:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchInventory()
    }, [])

    const getStatusColor = (days: number) => {
        if (days <= 2) return "destructive"
        if (days <= 5) return "warning"
        return "success"
    }

    const getStatusLabel = (days: number) => {
        if (days <= 2) return "Critical"
        if (days <= 5) return "Warning"
        return "Fresh"
    }

    if (loading) {
        return <div className="p-4 text-center text-muted-foreground">Memuat data inventaris...</div>
    }

    return (
        <Card className="border-0 shadow-md overflow-hidden py-0 gap-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 py-6">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Package className="w-5 h-5" />
                    Daftar Inventaris {role === "vendor" ? "Saya" : "Gudang"}
                </CardTitle>
                <CardDescription className="text-blue-600">
                    Status stok dan masa kadaluarsa terkini
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[200px]">Nama Barang</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead>Satuan</TableHead>
                            <TableHead>Sisa Hari</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Belum ada data inventaris
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <TableCell className="font-medium text-foreground">
                                        {item.item_name}
                                        {role === "kitchen" && item.owner_name && (
                                            <span className="block text-xs text-muted-foreground font-normal">
                                                Dari: {item.owner_name}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${item.expiry_days <= 2 ? "text-red-600" : "text-foreground"}`}>
                                                {item.expiry_days} Hari
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge
                                            variant={
                                                item.expiry_days <= 2 ? "destructive" :
                                                    item.expiry_days <= 5 ? "secondary" : "outline"
                                            }
                                            className={
                                                item.expiry_days > 5 ? "bg-green-100 text-green-700 hover:bg-green-200 border-green-200" : ""
                                            }
                                        >
                                            {item.expiry_days <= 2 && <AlertTriangle className="w-3 h-3 mr-1" />}
                                            {item.expiry_days > 5 && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {getStatusLabel(item.expiry_days)}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
