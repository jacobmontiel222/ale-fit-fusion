import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getState } from '@/lib/storage';
import { getDailyMeals, getMealTotals } from '@/lib/meals';

interface MacroData {
  protein: number;
  fat: number;
  carbs: number;
}

interface MealData {
  calories: number;
  macros: MacroData;
}

interface DayTotals {
  kcalTarget: number;
  kcalConsumed: number;
  macrosG: MacroData;
  macrosPct: MacroData;
  breakfast: MealData;
  lunch: MealData;
  dinner: MealData;
  snacks: MealData;
}

interface NutritionContextType {
  getTotals: (dateISO: string) => DayTotals;
  refreshTotals: () => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [refresh, setRefresh] = useState(0);
  
  // Listen for meals updates and auto-refresh
  useEffect(() => {
    const handleMealsUpdate = () => {
      setRefresh((prev) => prev + 1);
    };
    
    window.addEventListener('mealsUpdated', handleMealsUpdate);
    return () => window.removeEventListener('mealsUpdated', handleMealsUpdate);
  }, []);

  const getTotals = (dateISO: string): DayTotals => {
    const state = getState();
    const goals = state.goals;
    
    // Get meals from the new meals.ts system
    const dailyMeals = getDailyMeals(dateISO);
    
    // Calculate totals for each meal type
    const breakfastTotals = getMealTotals(dailyMeals.Desayuno);
    const lunchTotals = getMealTotals(dailyMeals.Comida);
    const dinnerTotals = getMealTotals(dailyMeals.Cena);
    
    const breakfast: MealData = {
      calories: breakfastTotals.calories,
      macros: {
        protein: breakfastTotals.protein,
        fat: breakfastTotals.fat,
        carbs: breakfastTotals.carbs,
      },
    };
    
    const lunch: MealData = {
      calories: lunchTotals.calories,
      macros: {
        protein: lunchTotals.protein,
        fat: lunchTotals.fat,
        carbs: lunchTotals.carbs,
      },
    };
    
    const dinner: MealData = {
      calories: dinnerTotals.calories,
      macros: {
        protein: dinnerTotals.protein,
        fat: dinnerTotals.fat,
        carbs: dinnerTotals.carbs,
      },
    };
    
    const snacks: MealData = { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } };

    // Calculate day totals
    const kcalConsumed = breakfast.calories + lunch.calories + dinner.calories + snacks.calories;
    const macrosG = {
      protein: breakfast.macros.protein + lunch.macros.protein + dinner.macros.protein + snacks.macros.protein,
      fat: breakfast.macros.fat + lunch.macros.fat + dinner.macros.fat + snacks.macros.fat,
      carbs: breakfast.macros.carbs + lunch.macros.carbs + dinner.macros.carbs + snacks.macros.carbs,
    };

    // Calculate percentages
    const macrosPct = {
      protein: goals.dailyCalories > 0 ? ((macrosG.protein * 4) / goals.dailyCalories) * 100 : 0,
      fat: goals.dailyCalories > 0 ? ((macrosG.fat * 9) / goals.dailyCalories) * 100 : 0,
      carbs: goals.dailyCalories > 0 ? ((macrosG.carbs * 4) / goals.dailyCalories) * 100 : 0,
    };

    return {
      kcalTarget: goals.dailyCalories,
      kcalConsumed: Math.round(kcalConsumed),
      macrosG: {
        protein: Math.round(macrosG.protein * 10) / 10,
        fat: Math.round(macrosG.fat * 10) / 10,
        carbs: Math.round(macrosG.carbs * 10) / 10,
      },
      macrosPct: {
        protein: Math.round(macrosPct.protein * 10) / 10,
        fat: Math.round(macrosPct.fat * 10) / 10,
        carbs: Math.round(macrosPct.carbs * 10) / 10,
      },
      breakfast: {
        ...breakfast,
        macros: {
          protein: Math.round(breakfast.macros.protein * 10) / 10,
          fat: Math.round(breakfast.macros.fat * 10) / 10,
          carbs: Math.round(breakfast.macros.carbs * 10) / 10,
        },
      },
      lunch: {
        ...lunch,
        macros: {
          protein: Math.round(lunch.macros.protein * 10) / 10,
          fat: Math.round(lunch.macros.fat * 10) / 10,
          carbs: Math.round(lunch.macros.carbs * 10) / 10,
        },
      },
      dinner: {
        ...dinner,
        macros: {
          protein: Math.round(dinner.macros.protein * 10) / 10,
          fat: Math.round(dinner.macros.fat * 10) / 10,
          carbs: Math.round(dinner.macros.carbs * 10) / 10,
        },
      },
      snacks: {
        ...snacks,
        macros: {
          protein: Math.round(snacks.macros.protein * 10) / 10,
          fat: Math.round(snacks.macros.fat * 10) / 10,
          carbs: Math.round(snacks.macros.carbs * 10) / 10,
        },
      },
    };
  };

  const refreshTotals = () => {
    setRefresh((prev) => prev + 1);
  };

  return (
    <NutritionContext.Provider value={{ getTotals, refreshTotals }}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within NutritionProvider');
  }
  return context;
}
