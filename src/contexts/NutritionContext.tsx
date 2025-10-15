import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

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
  getTotals: (dateISO: string) => Promise<DayTotals>;
  refreshTotals: () => void;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [refresh, setRefresh] = useState(0);
  const { user } = useAuth();
  
  // Listen for meals updates and auto-refresh
  useEffect(() => {
    const handleMealsUpdate = () => {
      setRefresh((prev) => prev + 1);
    };
    
    window.addEventListener('mealsUpdated', handleMealsUpdate);
    return () => window.removeEventListener('mealsUpdated', handleMealsUpdate);
  }, []);

  const getTotals = async (dateISO: string): Promise<DayTotals> => {
    // Default values if no user is logged in
    if (!user) {
      return {
        kcalTarget: 2000,
        kcalConsumed: 0,
        macrosG: { protein: 0, fat: 0, carbs: 0 },
        macrosPct: { protein: 0, fat: 0, carbs: 0 },
        breakfast: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } },
        lunch: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } },
        dinner: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } },
        snacks: { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } },
      };
    }

    // Get nutrition goals from Supabase
    const { data: goalsData } = await supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const goals = goalsData || {
      calories_goal: 2000,
      protein_goal: 150,
      fat_goal: 65,
      carbs_goal: 250,
    };

    // Get meal entries for the day from Supabase
    const { data: meals } = await supabase
      .from('meal_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', dateISO);

    // Initialize meal totals
    const breakfast: MealData = { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } };
    const lunch: MealData = { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } };
    const dinner: MealData = { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } };
    const snacks: MealData = { calories: 0, macros: { protein: 0, fat: 0, carbs: 0 } };

    // Calculate meal totals
    if (meals) {
      meals.forEach((meal) => {
        const calories = Number(meal.calories) || 0;
        const protein = Number(meal.protein) || 0;
        const fat = Number(meal.fat) || 0;
        const carbs = Number(meal.carbs) || 0;

        switch (meal.meal_type) {
          case 'Desayuno':
            breakfast.calories += calories;
            breakfast.macros.protein += protein;
            breakfast.macros.fat += fat;
            breakfast.macros.carbs += carbs;
            break;
          case 'Comida':
            lunch.calories += calories;
            lunch.macros.protein += protein;
            lunch.macros.fat += fat;
            lunch.macros.carbs += carbs;
            break;
          case 'Cena':
            dinner.calories += calories;
            dinner.macros.protein += protein;
            dinner.macros.fat += fat;
            dinner.macros.carbs += carbs;
            break;
        }
      });
    }

    // Calculate day totals
    const kcalConsumed = breakfast.calories + lunch.calories + dinner.calories + snacks.calories;
    const macrosG = {
      protein: breakfast.macros.protein + lunch.macros.protein + dinner.macros.protein + snacks.macros.protein,
      fat: breakfast.macros.fat + lunch.macros.fat + dinner.macros.fat + snacks.macros.fat,
      carbs: breakfast.macros.carbs + lunch.macros.carbs + dinner.macros.carbs + snacks.macros.carbs,
    };

    // Calculate percentages
    const macrosPct = {
      protein: goals.calories_goal > 0 ? ((macrosG.protein * 4) / goals.calories_goal) * 100 : 0,
      fat: goals.calories_goal > 0 ? ((macrosG.fat * 9) / goals.calories_goal) * 100 : 0,
      carbs: goals.calories_goal > 0 ? ((macrosG.carbs * 4) / goals.calories_goal) * 100 : 0,
    };

    return {
      kcalTarget: goals.calories_goal,
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
