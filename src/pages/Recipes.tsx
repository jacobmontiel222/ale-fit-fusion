import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChefHat, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface RecipeItem {
  id: string;
  food_name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  order_index: number;
}

interface Recipe {
  id: string;
  name: string;
  created_at: string;
  items: RecipeItem[];
  totals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}

const Recipes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [recipeToAdd, setRecipeToAdd] = useState<Recipe | null>(null);
  const mealOptions = [
    { storage: 'Desayuno', label: t('meals.breakfast') },
    { storage: 'Comida', label: t('meals.lunch') },
    { storage: 'Cena', label: t('meals.dinner') },
  ];

  useEffect(() => {
    loadRecipes();
  }, [user]);

  const loadRecipes = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: recipesData, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_items(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading recipes:', error);
        toast.error(t('recipes.loadError'));
        return;
      }

      if (recipesData) {
        const formattedRecipes: Recipe[] = recipesData.map((recipe) => {
          const items = (recipe.recipe_items || [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((item: any) => ({
              id: item.id,
              food_name: item.food_name,
              amount: Number(item.amount),
              unit: item.unit,
              calories: Number(item.calories),
              protein: Number(item.protein),
              fat: Number(item.fat),
              carbs: Number(item.carbs),
              order_index: item.order_index,
            }));

          const totals = items.reduce(
            (acc, item) => ({
              calories: acc.calories + item.calories,
              protein: acc.protein + item.protein,
              fat: acc.fat + item.fat,
              carbs: acc.carbs + item.carbs,
            }),
            { calories: 0, protein: 0, fat: 0, carbs: 0 }
          );

          return {
            id: recipe.id,
            name: recipe.name,
            created_at: recipe.created_at,
            items,
            totals,
          };
        });

        setRecipes(formattedRecipes);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('recipes.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!recipeToDelete || !user) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeToDelete)
        .eq('user_id', user.id);

      if (error) {
        toast.error(t('recipes.deleteError'));
        console.error(error);
        return;
      }

      toast.success(t('recipes.deleteSuccess'));
      setRecipes(recipes.filter((r) => r.id !== recipeToDelete));
    } catch (error) {
      toast.error(t('recipes.deleteError'));
      console.error(error);
    } finally {
      setDeleteDialogOpen(false);
      setRecipeToDelete(null);
    }
  };

  const confirmDelete = (recipeId: string) => {
    setRecipeToDelete(recipeId);
    setDeleteDialogOpen(true);
  };

  const openAddDialog = (recipe: Recipe) => {
    setRecipeToAdd(recipe);
    setAddDialogOpen(true);
  };

  const handleAddToMeal = async (mealOption: { storage: string; label: string }) => {
    if (!recipeToAdd || !user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Crear entradas de comida para cada item de la receta
      const mealEntries = recipeToAdd.items.map(item => ({
        user_id: user.id,
        date: today,
        meal_type: mealOption.storage,
        food_name: item.food_name,
        amount: item.amount,
        unit: item.unit,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        entry_method: 'manual',
      }));

      const { error } = await supabase
        .from('meal_entries')
        .insert(mealEntries);

      if (error) {
        toast.error(t('recipes.addError'));
        console.error(error);
        return;
      }

      toast.success(t('recipes.addedToMeal', { meal: mealOption.label }));
      setAddDialogOpen(false);
      setRecipeToAdd(null);
    } catch (error) {
      toast.error(t('recipes.addError'));
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/comidas')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">{t('recipes.title')}</h1>
          </div>
          <Button onClick={() => navigate('/create-recipe')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('recipes.new')}
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('recipes.loading')}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && recipes.length === 0 && (
          <StatsCard className="text-center py-12">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('recipes.emptyTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('recipes.emptyDescription')}
            </p>
            <Button onClick={() => navigate('/create-recipe')}>
              <Plus className="w-4 h-4 mr-2" />
              {t('recipes.create')}
            </Button>
          </StatsCard>
        )}

        {/* Recipes List */}
        {!loading && recipes.length > 0 && (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <StatsCard key={recipe.id} className="py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {recipe.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(recipe.created_at).toLocaleDateString(
                        i18n.language === 'en' ? 'en-US' : i18n.language,
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openAddDialog(recipe)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t('recipes.add')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(recipe.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('recipes.calories')}: </span>
                      <span className="font-semibold text-foreground">
                        {Math.round(recipe.totals.calories)} kcal
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('recipes.proteins')}: </span>
                      <span className="font-semibold text-foreground">
                        {recipe.totals.protein.toFixed(1)}g
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('recipes.fats')}: </span>
                      <span className="font-semibold text-foreground">
                        {recipe.totals.fat.toFixed(1)}g
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('recipes.carbs')}: </span>
                      <span className="font-semibold text-foreground">
                        {recipe.totals.carbs.toFixed(1)}g
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    {t('recipes.ingredients', { count: recipe.items.length })}
                  </p>
                  {recipe.items.map((item) => (
                    <div key={item.id} className="text-xs text-muted-foreground">
                      - {item.food_name} ({item.amount} {item.unit})
                    </div>
                  ))}
                </div>
              </StatsCard>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('recipes.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('recipes.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRecipe}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

            {/* Add to Meal Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('recipes.addToMealTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('recipes.addToMealQuestion', { name: recipeToAdd?.name })}
            </p>
            {mealOptions.map((option) => (
              <Button
                key={option.storage}
                className="w-full"
                onClick={() => handleAddToMeal(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recipes;
