import { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FoodItem, FoodCategory, FoodTag } from '@/types/food';
import { useFoodsDatabase } from '@/hooks/useFoodsDatabase';

interface FoodSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFood: (food: FoodItem) => void;
}

const CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: 'frutas', label: 'Frutas' },
  { value: 'verduras', label: 'Verduras' },
  { value: 'carnes', label: 'Carnes' },
  { value: 'pescados', label: 'Pescados' },
  { value: 'lacteos', label: 'Lácteos' },
  { value: 'legumbres', label: 'Legumbres' },
  { value: 'cereales', label: 'Cereales' },
  { value: 'frutos-secos', label: 'Frutos secos' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'aceites', label: 'Aceites' },
  { value: 'huevos', label: 'Huevos' },
  { value: 'otros', label: 'Otros' },
];

const TAGS: { value: FoodTag; label: string }[] = [
  { value: 'alto-proteina', label: 'Alto en proteína' },
  { value: 'bajo-grasa', label: 'Bajo en grasa' },
  { value: 'alto-fibra', label: 'Alto en fibra' },
  { value: 'bajo-calorias', label: 'Bajo en calorías' },
  { value: 'vegano', label: 'Vegano' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'sin-gluten', label: 'Sin gluten' },
  { value: 'sin-lactosa', label: 'Sin lactosa' },
];

export function FoodSearchModal({ open, onOpenChange, onSelectFood }: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<FoodCategory[]>([]);
  const [selectedTags, setSelectedTags] = useState<FoodTag[]>([]);
  const [results, setResults] = useState<FoodItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const { searchFoods, loading: dbLoading, foods } = useFoodsDatabase();

  // Realizar búsqueda
  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim() && selectedCategories.length === 0) {
        setResults([]);
        return;
      }

      try {
        const searchResults = await searchFoods(
          query, 
          selectedCategories.length > 0 ? selectedCategories : undefined
        );
        
        // Filtrar por tags si hay seleccionados
        const filteredResults = selectedTags.length > 0
          ? searchResults.filter(food => 
              selectedTags.some(tag => food.tags.includes(tag))
            )
          : searchResults;

        setResults(filteredResults);
      } catch (error) {
        console.error('Error searching foods:', error);
        setResults([]);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query, selectedCategories, selectedTags, searchFoods]);

  const toggleCategory = (category: FoodCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleTag = (tag: FoodTag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedCategories([]);
    setSelectedTags([]);
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedTags.length > 0;

  // Obtener categorías y tags disponibles
  const availableCategories = Array.from(new Set(foods.map(f => f.category)));
  const availableTags = Array.from(new Set(foods.flatMap(f => f.tags)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl">Buscar alimentos</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {dbLoading ? 'Cargando...' : `${foods.length} alimentos disponibles`}
          </p>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="px-6 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre... (ej: sandía, manzana)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-10"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {selectedCategories.length + selectedTags.length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="px-6 pb-4 border-t border-border">
            <Tabs defaultValue="categories" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="categories">Categorías</TabsTrigger>
                <TabsTrigger value="tags">Etiquetas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="categories" className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(cat => availableCategories.includes(cat.value)).map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={selectedCategories.includes(cat.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      {cat.label}
                    </Badge>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="tags" className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {TAGS.filter(tag => availableTags.includes(tag.value)).map((tag) => (
                    <Badge
                      key={tag.value}
                      variant={selectedTags.includes(tag.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.value)}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Resultados */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {dbLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Cargando alimentos...
            </div>
          ) : foods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">La base de datos está vacía</p>
              <p className="text-sm">Recarga la página para cargar los alimentos</p>
            </div>
          ) : !query && selectedCategories.length === 0 && selectedTags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">Busca un alimento</p>
              <p className="text-sm">Escribe el nombre del alimento que buscas</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">No se encontraron resultados</p>
              <p className="text-sm">Intenta con otros términos o filtros</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((food) => (
                <div
                  key={food.id}
                  onClick={() => {
                    onSelectFood(food);
                    onOpenChange(false);
                  }}
                  className="p-4 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{food.name}</h4>
                      {food.brand && (
                        <p className="text-xs text-muted-foreground">{food.brand}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORIES.find(c => c.value === food.category)?.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold">{food.calories} kcal</span>
                    <span className="text-muted-foreground">P: {food.protein}g</span>
                    <span className="text-muted-foreground">G: {food.fat}g</span>
                    <span className="text-muted-foreground">C: {food.carbs}g</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    por {food.servingSize} {food.servingUnit}
                  </p>
                  
                  {food.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {food.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {TAGS.find(t => t.value === tag)?.label || tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
