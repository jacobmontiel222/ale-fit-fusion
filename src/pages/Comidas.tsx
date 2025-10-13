import { useState, useEffect } from "react";
import { Plus, ChefHat, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { CircularProgress } from "@/components/CircularProgress";
import { BottomNav } from "@/components/BottomNav";
import { EditGoalModal } from "@/components/EditGoalModal";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Comidas = () => {
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEditModal, setShowEditModal] = useState(false);
  const [goals, setGoals] = useState(() => {
    const stored = localStorage.getItem("nutritionGoals");
    return stored ? JSON.parse(stored) : {
      calories: 2000,
      protein: 160,
      fat: 78,
      carbs: 200,
      useGrams: false,
    };
  });

  const [consumed, setConsumed] = useState({ calories: 1428, protein: 72, fat: 35, carbs: 25 });

  useEffect(() => {
    // Calculate consumed from meals
    const meals = JSON.parse(localStorage.getItem("meals") || "{}");
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    Object.values(meals).forEach((mealItems: any) => {
      mealItems.forEach((item: any) => {
        totalCalories += item.adjustedMacros.calories;
        totalProtein += item.adjustedMacros.protein;
        totalFat += item.adjustedMacros.fat;
        totalCarbs += item.adjustedMacros.carbs;
      });
    });

    setConsumed({
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
    });
  }, []);

  const handleSaveGoals = (newGoals: typeof goals) => {
    setGoals(newGoals);
    localStorage.setItem("nutritionGoals", JSON.stringify(newGoals));
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

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const weekDays = getWeekDays();

  const meals = [
    { name: "Desayuno", calories: 450 },
    { name: "Comida", calories: 720 },
    { name: "Cena", calories: 580 },
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

        {/* Main Calories Summary */}
        <StatsCard className="relative overflow-hidden py-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 rounded-full"
            onClick={() => setShowEditModal(true)}
          >
            <Settings className="w-5 h-5" />
          </Button>
          
          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1.5">Objetivo: {goals.calories} Kcal</p>
              <CircularProgress value={consumed.calories} max={goals.calories} size={110} strokeWidth={9} />
            </div>
            
            <div className="w-full space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Consumidas</span>
                <span className="text-foreground font-semibold">{consumed.calories} Kcal</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Restantes</span>
                <span className="text-foreground font-semibold">{goals.calories - consumed.calories} Kcal</span>
              </div>
              
              {/* Macros Distribution */}
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Proteínas</span>
                  <span className="text-foreground font-semibold">{consumed.protein}g / {goals.protein}g</span>
                </div>
                <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                  <div className="bg-progress-ring h-full rounded-full" style={{ width: `${calculateMacroPercentage(consumed.protein, goals.protein)}%` }} />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Grasas</span>
                  <span className="text-foreground font-semibold">{consumed.fat}g / {goals.fat}g</span>
                </div>
                <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                  <div className="bg-progress-ring h-full rounded-full" style={{ width: `${calculateMacroPercentage(consumed.fat, goals.fat)}%` }} />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Carbohidratos</span>
                  <span className="text-foreground font-semibold">{consumed.carbs}g / {goals.carbs}g</span>
                </div>
                <div className="w-full bg-progress-bg h-2 rounded-full overflow-hidden">
                  <div className="bg-progress-ring h-full rounded-full" style={{ width: `${calculateMacroPercentage(consumed.carbs, goals.carbs)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </StatsCard>

        {/* Meal Cards */}
        <div className="space-y-2.5">
          {meals.map((meal, index) => (
            <StatsCard key={index} className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-0.5">{meal.name}</h3>
                  <p className="text-muted-foreground text-sm">{meal.calories} Kcal</p>
                </div>
                <button 
                  onClick={() => navigate(`/add-food?meal=${meal.name}`)}
                  className="w-9 h-9 rounded-full bg-primary flex items-center justify-center hover:scale-105 transition-transform"
                >
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </StatsCard>
          ))}
        </div>

        {/* Recipes Card */}
        <StatsCard>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ChefHat className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Recetas</h3>
              <p className="text-sm text-muted-foreground">
                Crea y guarda tus recetas personalizadas.
              </p>
            </div>
          </div>
        </StatsCard>
      </div>

      <EditGoalModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        currentGoals={goals}
        onSave={handleSaveGoals}
      />

      <BottomNav />
    </div>
  );
};

export default Comidas;
