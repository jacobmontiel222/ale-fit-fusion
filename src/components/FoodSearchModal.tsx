import { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FoodItem, FoodCategory, FoodTag, FoodSearchFilters } from '@/types/food';
import { foodDatabase } from '@/lib/foodDatabase';
import { searchFoods } from '@/lib/foodSearch';
import { useTranslation } from 'react-i18next';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [filteredResults, setFilteredResults] = useState<FoodItem[]>([]);
  const [filters, setFilters] = useState<FoodSearchFilters>({
    query: '',
    categories: [],
    tags: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [foodCount, setFoodCount] = useState(0);
  const [availableCategories, setAvailableCategories] = useState<FoodCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<FoodTag[]>([]);
  const { t, i18n } = useTranslation();

  // Helper para obtener el nombre del alimento en el idioma actual
  const getFoodName = (food: FoodItem): string => {
    if (food.names) {
      const langKey = i18n.language as keyof typeof food.names;
      return food.names[langKey] || food.name;
    }
    return food.name;
  };

  // Cargar alimentos desde IndexedDB (CSV)
  useEffect(() => {
    const loadFoods = async () => {
      try {
        setLoading(true);
        
        // Limpiar y recargar con el idioma actual
        await foodDatabase.clearAll();
        
        const response = await fetch('/src/data/foods_database.csv');
        const csvText = await response.text();
        const { initializeFoodDatabase } = await import('@/lib/initFoodDatabase');
        await initializeFoodDatabase(i18n.language);
        
        const foods = await foodDatabase.getAllFoods();
        const count = await foodDatabase.getCount();
        setAllFoods(foods);
        setFoodCount(count);
        setFilteredResults([]);

        // Derivar categorías y tags disponibles
        const categories = new Set<FoodCategory>();
        const tags = new Set<FoodTag>();
        foods.forEach(food => {
          categories.add(food.category);
          food.tags.forEach(tag => tags.add(tag));
        });
        setAvailableCategories(Array.from(categories));
        setAvailableTags(Array.from(tags));
      } catch (error) {
        console.error('Error cargando alimentos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) loadFoods();
  }, [open, i18n.language]);

  // Buscar con filtros locales (fuzzy)
  useEffect(() => {
    if (!allFoods.length) return;

    const updatedFilters = { ...filters, query: searchQuery };
    const results = searchFoods(allFoods, updatedFilters);
    setFilteredResults(results.map(r => r.item).slice(0, 100));
  }, [searchQuery, filters, allFoods]);

  const toggleCategory = (category: FoodCategory) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const toggleTag = (tag: FoodTag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const clearFilters = () => {
    setFilters({ query: '', categories: [], tags: [] });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.categories.length > 0 || filters.tags.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl">{t('foodSearch.title')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {foodCount > 0 ? t('foodSearch.availableOffline', { count: foodCount }) : t('foodSearch.emptyDatabase')}
          </p>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="px-6 pb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('foodSearch.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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
              {t('foodSearch.filters')}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {filters.categories.length + filters.tags.length}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {t('foodSearch.clearFilters')}
              </Button>
            )}
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="px-6 pb-4 border-t border-border">
            <Tabs defaultValue="categories" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="categories">{t('foodSearch.categories')}</TabsTrigger>
                <TabsTrigger value="tags">{t('foodSearch.tags')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="categories" className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(cat => availableCategories.includes(cat.value)).map((cat) => (
                    <Badge
                      key={cat.value}
                      variant={filters.categories.includes(cat.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat.value)}
                    >
                      {t(`foodSearch.categoryLabels.${cat.value}`)}
                    </Badge>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="tags" className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {TAGS.filter(tag => availableTags.includes(tag.value)).map((tag) => (
                    <Badge
                      key={tag.value}
                      variant={filters.tags.includes(tag.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleTag(tag.value)}
                    >
                      {t(`foodSearch.tagLabels.${tag.value}`)}
                    </Badge>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Resultados */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('foodSearch.loading')}
            </div>
          ) : foodCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">{t('foodSearch.emptyDatabase')}</p>
              <p className="text-sm">{t('foodSearch.typeToSearch')}</p>
            </div>
          ) : !searchQuery && filters.categories.length === 0 && filters.tags.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">{t('foodSearch.searchFood')}</p>
              <p className="text-sm">{t('foodSearch.typeToSearch')}</p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">{t('foodSearch.noResults')}</p>
              <p className="text-sm">{t('foodSearch.tryOtherTerms')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredResults.map((food) => (
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
                      <h4 className="font-semibold text-foreground">{getFoodName(food)}</h4>
                      {food.brand && (
                        <p className="text-xs text-muted-foreground">{food.brand}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {t(`foodSearch.categoryLabels.${food.category}`)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold">{food.calories} kcal</span>
                    <span className="text-muted-foreground">P: {food.protein}g</span>
                    <span className="text-muted-foreground">G: {food.fat}g</span>
                    <span className="text-muted-foreground">C: {food.carbs}g</span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('foodSearch.per')} {food.servingSize} {food.servingUnit}
                  </p>
                  
                  {food.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {food.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {t(`foodSearch.tagLabels.${tag}`)}
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
