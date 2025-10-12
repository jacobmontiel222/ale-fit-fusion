import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Article {
  id: string;
  title: string;
  categories: string[];
  summary: string;
  date: string;
}

const categories = [
  "Nutrición",
  "Fitness",
  "Salud",
  "Recetas",
  "Suplementación",
  "Pérdida de grasa",
  "Ganancia muscular",
];

const mockArticles: Article[] = [
  {
    id: "1",
    title: "Guía completa de proteínas para ganar músculo",
    categories: ["Nutrición", "Ganancia muscular"],
    summary: "Aprende cuánta proteína necesitas realmente para maximizar tu crecimiento muscular y qué fuentes son las mejores.",
    date: "2024-10-10",
  },
  {
    id: "2",
    title: "10 recetas fitness para preparar en 15 minutos",
    categories: ["Recetas", "Nutrición"],
    summary: "Comidas rápidas, deliciosas y nutritivas perfectas para tu día a día. Ideal para quienes tienen poco tiempo.",
    date: "2024-10-09",
  },
  {
    id: "3",
    title: "Cómo optimizar tu déficit calórico sin perder músculo",
    categories: ["Nutrición", "Pérdida de grasa", "Fitness"],
    summary: "Estrategias comprobadas para mantener tu masa muscular mientras pierdes grasa de forma sostenible.",
    date: "2024-10-08",
  },
  {
    id: "4",
    title: "Los 5 mejores ejercicios para core funcional",
    categories: ["Fitness"],
    summary: "Fortalece tu núcleo con estos movimientos que mejoran tu rendimiento en todos los deportes y actividades diarias.",
    date: "2024-10-07",
  },
  {
    id: "5",
    title: "Suplementos esenciales vs opcionales: qué debes tomar",
    categories: ["Suplementación", "Salud"],
    summary: "Desmontamos mitos y te contamos qué suplementos realmente valen la pena según la ciencia actual.",
    date: "2024-10-06",
  },
  {
    id: "6",
    title: "Entrenamiento de fuerza para principiantes",
    categories: ["Fitness", "Ganancia muscular"],
    summary: "Todo lo que necesitas saber para empezar en el gimnasio: técnica, rutinas y progresión adecuada.",
    date: "2024-10-05",
  },
  {
    id: "7",
    title: "Importancia del sueño en la recuperación muscular",
    categories: ["Salud", "Ganancia muscular"],
    summary: "Por qué dormir bien es tan importante como entrenar: descubre cómo optimizar tu descanso para mejores resultados.",
    date: "2024-10-04",
  },
  {
    id: "8",
    title: "Batch cooking fitness: prepara tus comidas de la semana",
    categories: ["Recetas", "Nutrición"],
    summary: "Organiza tus comidas semanales en pocas horas. Incluye recetas, trucos de conservación y planning completo.",
    date: "2024-10-03",
  },
  {
    id: "9",
    title: "Cardio vs pesas para perder grasa: qué es mejor",
    categories: ["Fitness", "Pérdida de grasa"],
    summary: "Análisis basado en evidencia sobre qué tipo de ejercicio es más efectivo para quemar grasa y mantener músculo.",
    date: "2024-10-02",
  },
  {
    id: "10",
    title: "Vitaminas y minerales clave para deportistas",
    categories: ["Salud", "Suplementación", "Nutrición"],
    summary: "Qué micronutrientes son críticos para tu rendimiento y cómo asegurarte de que no tienes deficiencias.",
    date: "2024-10-01",
  },
  {
    id: "11",
    title: "Cómo aumentar tu metabolismo de forma natural",
    categories: ["Salud", "Pérdida de grasa"],
    summary: "Estrategias respaldadas por la ciencia para acelerar tu metabolismo sin recurrir a productos milagro.",
    date: "2024-09-30",
  },
  {
    id: "12",
    title: "Recetas altas en proteína para veganos",
    categories: ["Recetas", "Nutrición", "Ganancia muscular"],
    summary: "Opciones deliciosas y nutritivas basadas en plantas que te ayudarán a alcanzar tus objetivos de proteína diaria.",
    date: "2024-09-29",
  },
];

const Comunidad = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"relevance" | "recent">("relevance");

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const filteredArticles = mockArticles
    .filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           article.summary.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategories = selectedCategories.length === 0 ||
                               selectedCategories.some(cat => article.categories.includes(cat));
      
      return matchesSearch && matchesCategories;
    })
    .sort((a, b) => {
      if (sortOrder === "recent") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0; // relevance (default order)
    });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Comunidad</h1>
          <Select value={sortOrder} onValueChange={(value: "relevance" | "recent") => setSortOrder(value)}>
            <SelectTrigger className="w-32">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevancia</SelectItem>
              <SelectItem value="recent">Recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar artículos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategories.includes(category) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/90 transition-colors"
              onClick={() => toggleCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Active Filters Summary */}
        {selectedCategories.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Filtrando por:</span>
            <span className="font-semibold text-foreground">
              {selectedCategories.join(", ")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategories([])}
              className="h-6 text-xs"
            >
              Limpiar
            </Button>
          </div>
        )}

        {/* Articles List */}
        <div className="space-y-4 pt-2">
          {filteredArticles.length === 0 ? (
            <StatsCard>
              <p className="text-center text-muted-foreground py-8">
                No se encontraron artículos
              </p>
            </StatsCard>
          ) : (
            filteredArticles.map((article) => (
              <StatsCard key={article.id} className="cursor-pointer hover:bg-secondary/50 transition-colors">
                <div className="space-y-3">
                  {/* Categories */}
                  <div className="flex flex-wrap gap-2">
                    {article.categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-foreground leading-tight">
                    {article.title}
                  </h3>
                  
                  {/* Summary */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {article.summary}
                  </p>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(article.date).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    <Button variant="ghost" size="sm">
                      Leer
                    </Button>
                  </div>
                </div>
              </StatsCard>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Comunidad;
