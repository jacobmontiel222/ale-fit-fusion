import { useState, useEffect } from "react";
import { Plus, ChefHat, Settings, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { CircularProgress } from "@/components/CircularProgress";
import { BottomNav } from "@/components/BottomNav";
import { EditGoalModal } from "@/components/EditGoalModal";
import { MicronutrientsList } from "@/components/MicronutrientsList";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNutrition } from "@/contexts/NutritionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const Comidas = () => {
  const navigate = useNavigate();
  const { getTotals, refreshTotals } = useNutrition();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEditModal, setShowEditModal] = useState(false);
  const [dailyMeals, setDailyMeals] = useState<any[]>([]);
  const [dayTotals, setDayTotals] = useState({
    kcalTarget: 2000,
    kcalConsumed: 0,
    macrosG: { protein: 0, fat: 0, carbs: 0 },
    breakfast: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } },
    lunch: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } },
    dinner: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } }
  });
  const [goals, setGoals] = useState({
    dailyCalories: 2000,
    protein: 150,
    fat: 65,
    carbs: 250,
  });

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const dateISO = formatDate(selectedDate);
  
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Load meals
      const { data: meals } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateISO)
        .order('created_at', { ascending: true });

      setDailyMeals(meals || []);

      // Load nutrition totals
      const totals = await getTotals(dateISO);
      setDayTotals(totals);

      // Load goals
      const { data: goalsData } = await supabase
        .from('nutrition_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (goalsData) {
        setGoals({
          dailyCalories: goalsData.calories_goal,
          protein: goalsData.protein_goal,
          fat: goalsData.fat_goal,
          carbs: goalsData.carbs_goal,
        });
      }
    };

    loadData();
  }, [dateISO, user]);
  
  // Listen to meals updates to refresh in real-time
  useEffect(() => {
    const handleMealsUpdate = async () => {
      if (!user) return;
      
      const { data: meals } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateISO)
        .order('created_at', { ascending: true });

      setDailyMeals(meals || []);
      
      const totals = await getTotals(dateISO);
      setDayTotals(totals);
    };
    
    window.addEventListener('mealsUpdated', handleMealsUpdate);
    return () => window.removeEventListener('mealsUpdated', handleMealsUpdate);
  }, [dateISO, getTotals, refreshTotals, user]);
  
  const handleRemoveItem = async (mealType: string, itemId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('meal_entries')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (!error) {
      const { data: meals } = await supabase
        .from('meal_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateISO)
        .order('created_at', { ascending: true });

      setDailyMeals(meals || []);
      
      const totals = await getTotals(dateISO);
      setDayTotals(totals);
    }
  };

  const handleSaveGoals = async (newGoals: any) => {
    if (!user) return;

    const { error } = await supabase
      .from('nutrition_goals')
      .upsert({
        user_id: user.id,
        calories_goal: newGoals.calories,
        protein_goal: newGoals.protein,
        fat_goal: newGoals.fat,
        carbs_goal: newGoals.carbs,
      }, {
        onConflict: 'user_id'
      });

    if (!error) {
      setGoals({
        dailyCalories: newGoals.calories,
        protein: newGoals.protein,
        fat: newGoals.fat,
        carbs: newGoals.carbs,
      });
      const totals = await getTotals(dateISO);
      setDayTotals(totals);
    }
  };

  const calculateMacroPercentage = (consumed: number, goal: number) => {
    return Math.min(100, (consumed / goal) * 100);
  };

  // Generate calendar days (current week)
  const getWeekDays = () => {
    const days = [];
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const meals = [
    { 
      name: "Desayuno", 
      calories: dayTotals.breakfast.calories,
      macros: dayTotals.breakfast.macros,
    },
    { 
      name: "Comida", 
      calories: dayTotals.lunch.calories,
      macros: dayTotals.lunch.macros,
    },
    { 
      name: "Cena", 
      calories: dayTotals.dinner.calories,
      macros: dayTotals.dinner.macros,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Comidas</h1>
        </div>

        {/* Mini Calendar */}
        <StatsCard className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </h2>
            <Button variant="ghost" size="icon">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, idx) => {
              const isSelected = formatDate(day) === formatDate(selectedDate);
              const isToday = formatDate(day) === formatDate(new Date());
              
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center py-2 rounded-lg transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  }`}
                >
                  <span className="text-xs text-muted-foreground mb-1">
                    {day.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase()}
                  </span>
                  <span className={`text-sm font-semibold ${isToday ? 'text-accent' : ''}`}>
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </StatsCard>

        {/* Main Calories Summary with Tabs */}
        <StatsCard className="relative overflow-hidden py-3">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 rounded-full z-10"
            onClick={() => setShowEditModal(true)}
          >
            <Settings className="w-5 h-5" />
          </Button>
          
          <Tabs defaultValue="macros" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="macros">Macros</TabsTrigger>
              <TabsTrigger value="micronutrients">Micronutrientes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="macros" className="mt-0">
              <div className="flex flex-col items-center gap-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Objetivo: {dayTotals.kcalTarget} Kcal</p>
                  <CircularProgress 
                    value={dayTotals.kcalConsumed} 
                    max={dayTotals.kcalTarget} 
                    size={110} 
                    strokeWidth={9}
                  protein={dayTotals.macrosG.protein}
                    fat={dayTotals.macrosG.fat}
                    carbs={dayTotals.macrosG.carbs}
                    proteinGoal={goals.protein}
                    fatGoal={goals.fat}
                    carbsGoal={goals.carbs}
                    showMacroColors={true}
                  />
                </div>
                
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Consumidas</span>
                    <span className="text-foreground font-semibold">{dayTotals.kcalConsumed} Kcal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Restantes</span>
                    <span className="text-foreground font-semibold">{Math.max(0, dayTotals.kcalTarget - dayTotals.kcalConsumed)} Kcal</span>
                  </div>
                  
                  {/* Macros Distribution */}
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--protein))' }}></span>
                        Proteínas
                      </span>
                      <span className="text-foreground font-semibold">{dayTotals.macrosG.protein}g / {goals.protein}g</span>
                    </div>
                    <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (dayTotals.macrosG.protein / goals.protein) * 100)}%`, backgroundColor: 'hsl(var(--protein))' }} />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--fat))' }}></span>
                        Grasas
                      </span>
                      <span className="text-foreground font-semibold">{dayTotals.macrosG.fat}g / {goals.fat}g</span>
                    </div>
                    <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (dayTotals.macrosG.fat / goals.fat) * 100)}%`, backgroundColor: 'hsl(var(--fat))' }} />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--carbs))' }}></span>
                        Carbohidratos
                      </span>
                      <span className="text-foreground font-semibold">{dayTotals.macrosG.carbs}g / {goals.carbs}g</span>
                    </div>
                    <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (dayTotals.macrosG.carbs / goals.carbs) * 100)}%`, backgroundColor: 'hsl(var(--carbs))' }} />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="micronutrients" className="mt-0">
              <MicronutrientsList />
            </TabsContent>
          </Tabs>
        </StatsCard>

        {/* Meal Cards */}
        <div className="space-y-2.5">
          {[
            { name: "Desayuno", data: dayTotals.breakfast },
            { name: "Comida", data: dayTotals.lunch },
            { name: "Cena", data: dayTotals.dinner }
          ].map((meal, index) => {
            const mealItems = dailyMeals.filter((m: any) => m.meal_type === meal.name);
            
            return (
              <StatsCard key={index} className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-0.5">{meal.name}</h3>
                    {meal.data.calories > 0 ? (
                      <div className="text-sm">
                        <p className="text-foreground font-semibold">{Math.round(meal.data.calories)} Kcal</p>
                        <p className="text-muted-foreground text-xs">
                          P: {Math.round(meal.data.macros.protein)}g · G: {Math.round(meal.data.macros.fat)}g · C: {Math.round(meal.data.macros.carbs)}g
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Sin alimentos añadidos</p>
                    )}
                  </div>
                  <button 
                    onClick={() => navigate(`/add-food?meal=${meal.name}&date=${dateISO}`)}
                    className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Plus className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
                
                {/* List of foods in this meal */}
                {mealItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    {mealItems.map((item: any) => (
                      <div key={item.id} className="flex items-start justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.food_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.amount} {item.unit} · {Math.round(item.calories)} kcal
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveItem(meal.name, item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </StatsCard>
            );
          })}
        </div>

        {/* Recipes Card */}
        <StatsCard className="cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => navigate("/recipes")}>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">Recetas</h3>
              <p className="text-sm text-muted-foreground">
                Crea y guarda tus recetas personalizadas.
              </p>
            </div>
            <Button size="icon" variant="ghost" className="rounded-full">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </StatsCard>
      </div>

      <EditGoalModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        currentGoals={{
          calories: goals.dailyCalories,
          protein: goals.protein,
          fat: goals.fat,
          carbs: goals.carbs,
          useGrams: false,
        }}
        onSave={handleSaveGoals}
      />

      <BottomNav />
    </div>
  );
};

export default Comidas;
