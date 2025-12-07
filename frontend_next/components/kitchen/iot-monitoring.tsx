"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { Thermometer, Droplets, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface IoTLog {
  timestamp: string
  temperature: number
  humidity: number
}

export default function IoTMonitoring() {
  const [logs, setLogs] = useState<IoTLog[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/iot/logs")
        const data = await response.json()

        // Fix: Backend returns { logs: [...] }, not just [...]
        const logData = data.logs || data

        if (Array.isArray(logData)) {
          const formattedLogs = logData.map((log: any) => ({
            timestamp: new Date(log.created_at).toLocaleTimeString(),
            temperature: log.temperature,
            humidity: log.humidity,
          }))
          // Reverse to show oldest to newest on chart
          setLogs(formattedLogs.reverse().slice(-20))
        }
      } catch (error) {
        console.error("Error fetching IoT logs:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const latestTemp = logs.length > 0 ? logs[logs.length - 1].temperature : 0
  const latestHumidity = logs.length > 0 ? logs[logs.length - 1].humidity : 0
  const isAlertTemp = latestTemp > 4 || latestTemp < 0 // Cold storage should be 0-4°C
  const isAlertHumidity = latestHumidity > 80 || latestHumidity < 40

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Memuat data sensor...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className={isAlertTemp ? "border-l-4 border-l-red-500" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-red-500" />
              Suhu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground mb-2">{latestTemp.toFixed(1)}°C</div>
            <p className="text-sm text-muted-foreground">
              {isAlertTemp ? "⚠️ Di luar rentang ideal (0-4°C)" : "✓ Dalam rentang ideal"}
            </p>
          </CardContent>
        </Card>

        <Card className={isAlertHumidity ? "border-l-4 border-l-yellow-500" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Kelembaban
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground mb-2">{latestHumidity.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">
              {isAlertHumidity ? "⚠️ Di luar rentang ideal (40-80%)" : "✓ Dalam rentang ideal"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(isAlertTemp || isAlertHumidity) && (
        <Alert className="border-l-4 border-l-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-800">
            Kondisi penyimpanan tidak optimal! Segera periksa sistem pendingin.
          </AlertDescription>
        </Alert>
      )}

      {/* Charts */}
      {logs.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Grafik Suhu (Last 20 min)</CardTitle>
              <CardDescription>Pantau tren suhu penyimpanan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={logs}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="var(--chart-1)"
                    fillOpacity={1}
                    fill="url(#colorTemp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Grafik Kelembaban (Last 20 min)</CardTitle>
              <CardDescription>Pantau tren kelembaban penyimpanan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={logs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    name="Kelembaban (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
