import { useState, useEffect } from "react";
import { Plus, ChefHat, Settings, ChevronLeft, ChevronRight, Trash2, CalendarIcon } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { CircularProgress } from "@/components/CircularProgress";
import { BottomNav } from "@/components/BottomNav";
import { EditGoalModal } from "@/components/EditGoalModal";
import { MicronutrientsList } from "@/components/MicronutrientsList";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useNutrition } from "@/contexts/NutritionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNutritionGoals } from "@/hooks/useNutritionGoals";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const Comidas = () => {
  const navigate = useNavigate();
  const { getTotals, refreshTotals } = useNutrition();
  const { user } = useAuth();
  const { goals: nutritionGoals, updateGoals } = useNutritionGoals();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEditModal, setShowEditModal] = useState(false);
  const [dailyMeals, setDailyMeals] = useState<any[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayTotals, setDayTotals] = useState({
    kcalTarget: 2000,
    kcalConsumed: 0,
    macrosG: { protein: 0, fat: 0, carbs: 0 },
    breakfast: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } },
    lunch: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } },
    dinner: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } }
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
    };

    loadData();
  }, [dateISO, user, getTotals]);
  
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
    try {
      await updateGoals({
        calories_goal: newGoals.calories,
        protein_goal: newGoals.protein,
        fat_goal: newGoals.fat,
        carbs_goal: newGoals.carbs,
      });
      const totals = await getTotals(dateISO);
      setDayTotals(totals);
    } catch (error) {
      console.error('Error updating goals:', error);
    }
  };

  const calculateMacroPercentage = (consumed: number, goal: number) => {
    return Math.min(100, (consumed / goal) * 100);
  };

  // Generate calendar days (current week - Monday to Sunday)
  const getWeekDays = () => {
    const days = [];
    const current = new Date(selectedDate);
    const dayOfWeek = current.getDay();
    // Adjust so Monday = 0, Tuesday = 1, ..., Sunday = 6
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - mondayOffset);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  const weekDays = getWeekDays();

  const meals = [
    { 
      name: t('meals.breakfast'), 
      calories: dayTotals.breakfast.calories,
      macros: dayTotals.breakfast.macros,
    },
    { 
      name: t('meals.lunch'), 
      calories: dayTotals.lunch.calories,
      macros: dayTotals.lunch.macros,
    },
    { 
      name: t('meals.dinner'), 
      calories: dayTotals.dinner.calories,
      macros: dayTotals.dinner.macros,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('meals.title')}</h1>
        </div>

        {/* Mini Calendar */}
        <StatsCard className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="font-semibold text-lg">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {selectedDate.toLocaleDateString(i18n.language === 'en' ? 'en-US' : i18n.language === 'es' ? 'es-ES' : i18n.language, { month: 'long', year: 'numeric' })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
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
        <StatsCard className="overflow-hidden py-3">
          <Tabs defaultValue="macros" className="w-full">
            {/* Header with Edit Button */}
            <div className="flex items-center justify-between mb-3 pr-1">
              <TabsList className="grid w-full grid-cols-2 flex-1">
                <TabsTrigger value="macros" className="text-sm truncate">{t('meals.macrosTab')}</TabsTrigger>
                <TabsTrigger value="micronutrients" className="text-sm truncate">{t('meals.micronutrientsTab')}</TabsTrigger>
              </TabsList>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 rounded-full min-w-[44px] min-h-[44px] flex-shrink-0"
                onClick={() => setShowEditModal(true)}
                aria-label={t('meals.editMacros')}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
            
            <TabsContent value="macros" className="mt-0">
              <div className="flex flex-col items-center gap-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('dashboard.goal')}: {dayTotals.kcalTarget} Kcal</p>
                   <CircularProgress 
                    value={dayTotals.kcalConsumed} 
                    max={dayTotals.kcalTarget} 
                    size={110} 
                    strokeWidth={9}
                  protein={dayTotals.macrosG.protein}
                    fat={dayTotals.macrosG.fat}
                    carbs={dayTotals.macrosG.carbs}
                    proteinGoal={nutritionGoals?.protein_goal || 150}
                    fatGoal={nutritionGoals?.fat_goal || 65}
                    carbsGoal={nutritionGoals?.carbs_goal || 250}
                    showMacroColors={true}
                  />
                </div>
                
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t('common.consumed')}</span>
                    <span className="text-foreground font-semibold">{dayTotals.kcalConsumed} Kcal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">{t('common.remaining')}</span>
                    <span className="text-foreground font-semibold">{Math.max(0, dayTotals.kcalTarget - dayTotals.kcalConsumed)} Kcal</span>
                  </div>
                  
                  {/* Macros Distribution */}
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--protein))' }}></span>
                        {t('dashboard.proteins')}
                      </span>
                       <span className="text-foreground font-semibold">{dayTotals.macrosG.protein}g / {nutritionGoals?.protein_goal || 150}g</span>
                    </div>
                    <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (dayTotals.macrosG.protein / (nutritionGoals?.protein_goal || 150)) * 100)}%`, backgroundColor: 'hsl(var(--protein))' }} />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--fat))' }}></span>
                        {t('dashboard.fats')}
                      </span>
                      <span className="text-foreground font-semibold">{dayTotals.macrosG.fat}g / {nutritionGoals?.fat_goal || 65}g</span>
                    </div>
                    <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (dayTotals.macrosG.fat / (nutritionGoals?.fat_goal || 65)) * 100)}%`, backgroundColor: 'hsl(var(--fat))' }} />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--carbs))' }}></span>
                        {t('dashboard.carbs')}
                      </span>
                      <span className="text-foreground font-semibold">{dayTotals.macrosG.carbs}g / {nutritionGoals?.carbs_goal || 250}g</span>
                    </div>
                    <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (dayTotals.macrosG.carbs / (nutritionGoals?.carbs_goal || 250)) * 100)}%`, backgroundColor: 'hsl(var(--carbs))' }} />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="micronutrients" className="mt-0">
              <MicronutrientsList date={dateISO} />
            </TabsContent>
          </Tabs>
        </StatsCard>

        {/* Meal Cards */}
        <div className="space-y-2.5">
          {[
            { name: t('meals.breakfast'), data: dayTotals.breakfast },
            { name: t('meals.lunch'), data: dayTotals.lunch },
            { name: t('meals.dinner'), data: dayTotals.dinner }
          ].map((meal, index) => {
            const mealItems = dailyMeals.filter((m: any) => {
              const mealTypeMap: Record<string, string> = {
                [t('meals.breakfast')]: 'Desayuno',
                [t('meals.lunch')]: 'Comida',
                [t('meals.dinner')]: 'Cena'
              };
              return m.meal_type === mealTypeMap[meal.name];
            });
            
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
                      <p className="text-muted-foreground text-sm">{t('meals.noFoodsAdded')}</p>
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
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('meals.recipes')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('meals.recipesDescription')}
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
          calories: nutritionGoals?.calories_goal || 2000,
          protein: nutritionGoals?.protein_goal || 150,
          fat: nutritionGoals?.fat_goal || 65,
          carbs: nutritionGoals?.carbs_goal || 250,
          useGrams: false,
        }}
        onSave={handleSaveGoals}
      />

      <BottomNav />
    </div>
  );
};

export default Comidas;
