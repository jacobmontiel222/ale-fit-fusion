import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatsCard } from "@/components/StatsCard";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface RecipeItem {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

const CreateRecipe = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipeName, setRecipeName] = useState("");
  const [items, setItems] = useState<RecipeItem[]>([]);

  // Load pending items and recipe name from sessionStorage on mount
  useEffect(() => {
    const pendingItems = sessionStorage.getItem("pendingRecipeItems");
    if (pendingItems) {
      setItems(JSON.parse(pendingItems));
    }
    
    const pendingName = sessionStorage.getItem("pendingRecipeName");
    if (pendingName) {
      setRecipeName(pendingName);
    }
  }, []);

  // Save items to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem("pendingRecipeItems", JSON.stringify(items));
  }, [items]);

  // Save recipe name to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem("pendingRecipeName", recipeName);
  }, [recipeName]);

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    return items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        fat: acc.fat + item.fat,
        carbs: acc.carbs + item.carbs,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
  };

  const handleSaveRecipe = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para guardar recetas");
      return;
    }

    if (!recipeName.trim()) {
      toast.error("Por favor, añade un nombre a la receta");
      return;
    }

    if (items.length === 0) {
      toast.error("Por favor, añade al menos un alimento");
      return;
    }

    try {
      // 1. Crear la receta en Supabase
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          name: recipeName
        })
        .select()
        .single();

      if (recipeError || !recipe) {
        toast.error("Error al guardar la receta");
        console.error(recipeError);
        return;
      }

      // 2. Guardar todos los ingredientes
      const recipeItems = items.map((item, index) => ({
        recipe_id: recipe.id,
        food_name: item.name,
        amount: item.amount,
        unit: item.unit,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        order_index: index
      }));

      const { error: itemsError } = await supabase
        .from('recipe_items')
        .insert(recipeItems);

      if (itemsError) {
        // Si falla al guardar los items, eliminar la receta
        await supabase.from('recipes').delete().eq('id', recipe.id);
        toast.error("Error al guardar los ingredientes");
        console.error(itemsError);
        return;
      }

      // 3. Limpiar sessionStorage
      sessionStorage.removeItem("pendingRecipeItems");
      sessionStorage.removeItem("pendingRecipeName");

      toast.success(`${recipeName} se ha guardado correctamente`);
      navigate("/recipes");
    } catch (error) {
      toast.error("Error inesperado al guardar la receta");
      console.error(error);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              sessionStorage.removeItem("pendingRecipeItems");
              sessionStorage.removeItem("pendingRecipeName");
              navigate("/recipes");
            }}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Crear receta</h1>
        </div>

        {/* Recipe Name */}
        <StatsCard>
          <div>
            <Label htmlFor="recipeName">Nombre de la receta</Label>
            <Input
              id="recipeName"
              placeholder="Ej: Pollo con arroz"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
            />
          </div>
        </StatsCard>

        {/* Add Food Button */}
        <Button
          onClick={() => navigate("/add-food?meal=recipe")}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Añadir alimento
        </Button>

        {/* Food Items List */}
        {items.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Alimentos</h3>
            {items.map((item, index) => (
              <StatsCard key={index} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.amount} {item.unit}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.calories} kcal · P: {item.protein}g · G: {item.fat}g · C: {item.carbs}g
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                    className="rounded-full text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </StatsCard>
            ))}
          </div>
        )}

        {/* Totals */}
        {items.length > 0 && (
          <StatsCard>
            <h3 className="font-semibold text-foreground mb-3">Totales de la receta</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Calorías</span>
                <span className="font-semibold">{totals.calories} kcal</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Proteínas</span>
                <span className="font-semibold">{totals.protein.toFixed(1)} g</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Grasas</span>
                <span className="font-semibold">{totals.fat.toFixed(1)} g</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Carbohidratos</span>
                <span className="font-semibold">{totals.carbs.toFixed(1)} g</span>
              </div>
            </div>
          </StatsCard>
        )}

        {/* Save Button */}
        <Button onClick={handleSaveRecipe} className="w-full">
          Guardar receta
        </Button>
      </div>
    </div>
  );
};

export default CreateRecipe;
