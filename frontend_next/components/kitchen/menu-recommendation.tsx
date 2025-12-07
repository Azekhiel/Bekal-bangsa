"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChefHat, Zap, Plus, X, Flame } from "lucide-react"

interface MenuRecommendation {
  menu_name: string
  description: string
  nutrition: {
    calories: string
    protein: string
    carbs?: string
    fats?: string
  }
  reason: string
  ingredients: string[]
  ingredients_needed: string[]
  cooking_steps: string[]
}

export default function MenuRecommendation() {
  const [ingredients, setIngredients] = useState<string[]>([])
  const [newIngredient, setNewIngredient] = useState("")
  const [recommendations, setRecommendations] = useState<MenuRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [availableStock, setAvailableStock] = useState<any[]>([])

  // Fetch available stock on mount
  useState(() => {
    const fetchStock = async () => {
      try {
        const res = await fetch("/api/supplies?limit=20")
        const data = await res.json()
        if (Array.isArray(data)) {
          setAvailableStock(data)
        }
      } catch (err) {
        console.error("Failed to fetch stock:", err)
      }
    }
    fetchStock()
  })

  const handleAddIngredient = (name?: string) => {
    const ingredientToAdd = name || newIngredient
    if (ingredientToAdd.trim() && !ingredients.includes(ingredientToAdd.trim())) {
      setIngredients([...ingredients, ingredientToAdd.trim()])
      setNewIngredient("")
    }
  }

  const handleRemoveIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter((i) => i !== ingredient))
  }

  const handleGetRecommendations = async () => {
    if (ingredients.length === 0) return

    setLoading(true)
    try {
      const response = await fetch("/api/recommend-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients }),
      })
      const data = await response.json()

      if (data.error) {
        alert(`Gagal mendapatkan rekomendasi: ${data.error}`)
        return
      }

      // Robust handling for various AI response formats
      let recs: MenuRecommendation[] = []

      if (data.recommendations && Array.isArray(data.recommendations)) {
        recs = data.recommendations
      } else if (Array.isArray(data)) {
        recs = data
      } else if (data.menu_name) {
        // Single object response fallback
        recs = [data as MenuRecommendation]
      }

      if (recs.length === 0) {
        console.warn("No recommendations found in data:", data)
      }

      setRecommendations(recs)
    } catch (error) {
      console.error("Error getting recommendations:", error)
      alert(`Terjadi kesalahan: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md overflow-hidden py-0 gap-0">
        <CardHeader className="bg-gradient-to-r from-secondary/10 to-amber-50 border-b border-secondary/20 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-secondary/20 p-2 rounded-lg">
              <ChefHat className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <CardTitle>Rekomendasi Menu AI</CardTitle>
              <CardDescription>Pilih bahan dari stok tersedia atau ketik manual</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 pb-6">
          <div className="space-y-4">
            {/* Available Stock Selection */}
            {availableStock.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Stok Tersedia:</p>
                <div className="flex flex-wrap gap-2">
                  {availableStock.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddIngredient(item.item_name)}
                      disabled={ingredients.includes(item.item_name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${ingredients.includes(item.item_name)
                          ? "bg-secondary/10 text-secondary border-secondary/20 opacity-50 cursor-not-allowed"
                          : "bg-white text-foreground border-border hover:border-secondary hover:text-secondary"
                        }`}
                    >
                      {item.item_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Atau ketik bahan manual..."
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
                className="border-primary/30 focus:border-primary"
              />
              <Button
                onClick={() => handleAddIngredient()}
                className="bg-primary hover:bg-primary/90 text-white font-medium px-4"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                {ingredients.map((ingredient) => (
                  <button
                    key={ingredient}
                    onClick={() => handleRemoveIngredient(ingredient)}
                    className="bg-secondary hover:bg-secondary/90 text-white px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-2"
                  >
                    {ingredient}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            <Button
              onClick={handleGetRecommendations}
              disabled={ingredients.length === 0 || loading}
              className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold py-6 rounded-lg flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {loading ? "Sedang Meracik Menu..." : "Dapatkan Rekomendasi Menu"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          {recommendations.map((menu, idx) => (
            <Card key={idx} className="border-0 shadow-md border-l-4 border-l-secondary overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-secondary/10 to-amber-50 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="bg-secondary/20 p-2 rounded-lg mt-1">
                      <Flame className="w-4 h-4 text-secondary" />
                    </div>
                    <CardTitle className="text-xl">{menu.menu_name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <p className="text-muted-foreground">{menu.description}</p>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Bahan yang Digunakan:</p>
                    <div className="flex flex-wrap gap-2">
                      {menu.ingredients?.map((ing, i) => (
                        <span key={i} className="text-xs bg-white border px-2 py-1 rounded-full text-muted-foreground">
                          {ing}
                        </span>
                      )) || <span className="text-xs text-muted-foreground">Tidak ada data bahan.</span>}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-2 text-blue-800">Bahan yang Dibutuhkan:</p>
                    <ul className="space-y-1">
                      {menu.ingredients_needed?.map((ing, i) => (
                        <li key={i} className="text-xs text-blue-700 flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5" />
                          {ing}
                        </li>
                      )) || <li className="text-xs text-muted-foreground">Tidak ada detail bahan.</li>}
                    </ul>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg mb-4 border border-orange-100">
                  <p className="text-sm font-semibold mb-3 text-orange-800 flex items-center gap-2">
                    <ChefHat className="w-4 h-4" />
                    Langkah Memasak
                  </p>
                  <div className="space-y-2">
                    {menu.cooking_steps?.map((step, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="font-bold text-orange-400 w-5 flex-shrink-0">{i + 1}.</span>
                        <p className="text-orange-900">{step}</p>
                      </div>
                    )) || <p className="text-sm text-muted-foreground">Tidak ada langkah memasak.</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50 border border-primary/20 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2 font-semibold">Nutrisi per Porsi</p>
                    <div className="space-y-1">
                      <p className="font-bold text-foreground text-lg">{menu.nutrition.calories}</p>
                      <p className="text-sm text-muted-foreground">Protein: {menu.nutrition.protein}</p>
                      {menu.nutrition.carbs && <p className="text-sm text-muted-foreground">Karbo: {menu.nutrition.carbs}</p>}
                      {menu.nutrition.fats && <p className="text-sm text-muted-foreground">Lemak: {menu.nutrition.fats}</p>}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-secondary/30 p-4 rounded-lg">
                    <p className="text-sm font-semibold mb-2 text-secondary">Alasan Rekomendasi</p>
                    <p className="text-sm text-foreground">{menu.reason}</p>
                  </div>
                </div>

                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-lg">
                  <Flame className="w-4 h-4 mr-2" />
                  Mulai Memasak
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
