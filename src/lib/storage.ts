// Local storage persistence layer
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface Profile {
  name?: string;
  weightUnit: 'kg' | 'lb';
  height?: number;
  kcalPerStep?: number;
}

interface Goals {
  dailyCalories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface WeightEntry {
  date: string;
  kg: number;
}

interface StepsEntry {
  date: string;
  steps: number;
}

interface AppState {
  profile: Profile;
  goals: Goals;
  analyticsWeight: WeightEntry[];
  analyticsSteps: StepsEntry[];
  meals: any[];
  recipes: any[];
}

const DEFAULT_STATE: AppState = {
  profile: {
    weightUnit: 'kg',
    kcalPerStep: 0.045,
  },
  goals: {
    dailyCalories: 2000,
    protein: 150,
    fat: 67,
    carbs: 250,
  },
  analyticsWeight: [],
  analyticsSteps: [],
  meals: [],
  recipes: [],
};

// Get full state
export function getState(): AppState {
  const profile = localStorage.getItem('profile');
  const goals = localStorage.getItem('goals');
  const analyticsWeight = localStorage.getItem('analyticsWeight');
  const analyticsSteps = localStorage.getItem('analyticsSteps');
  const meals = localStorage.getItem('meals');
  const recipes = localStorage.getItem('recipes');

  return {
    profile: profile ? JSON.parse(profile) : DEFAULT_STATE.profile,
    goals: goals ? JSON.parse(goals) : DEFAULT_STATE.goals,
    analyticsWeight: analyticsWeight ? JSON.parse(analyticsWeight) : DEFAULT_STATE.analyticsWeight,
    analyticsSteps: analyticsSteps ? JSON.parse(analyticsSteps) : DEFAULT_STATE.analyticsSteps,
    meals: meals ? JSON.parse(meals) : DEFAULT_STATE.meals,
    recipes: recipes ? JSON.parse(recipes) : DEFAULT_STATE.recipes,
  };
}

// Update state partially
export function setState(patch: Partial<AppState>) {
  Object.entries(patch).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
}

// Upsert weight entry
export function upsertWeight({ dateISO, kg }: { dateISO: string; kg: number }) {
  const state = getState();
  const index = state.analyticsWeight.findIndex(entry => entry.date === dateISO);
  
  if (index >= 0) {
    state.analyticsWeight[index] = { date: dateISO, kg };
  } else {
    state.analyticsWeight.push({ date: dateISO, kg });
  }
  
  state.analyticsWeight.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem('analyticsWeight', JSON.stringify(state.analyticsWeight));
}

// Upsert steps entry
export function upsertSteps({ dateISO, steps }: { dateISO: string; steps: number }) {
  const state = getState();
  const index = state.analyticsSteps.findIndex(entry => entry.date === dateISO);
  
  if (index >= 0) {
    state.analyticsSteps[index] = { date: dateISO, steps };
  } else {
    state.analyticsSteps.push({ date: dateISO, steps });
  }
  
  state.analyticsSteps.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem('analyticsSteps', JSON.stringify(state.analyticsSteps));
}

// Get date range
export function getRange(type: string, now: Date = new Date()): { start: Date; end: Date; days: string[] } {
  let start: Date;
  let end: Date;

  switch (type) {
    case 'Esta semana':
      start = startOfWeek(now, { locale: es });
      end = endOfWeek(now, { locale: es });
      break;
    case 'La semana pasada':
      const lastWeekDate = new Date(now);
      lastWeekDate.setDate(now.getDate() - 7);
      start = startOfWeek(lastWeekDate, { locale: es });
      end = endOfWeek(lastWeekDate, { locale: es });
      break;
    case 'Este mes':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'El mes pasado':
      const lastMonth = subMonths(now, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
      break;
    case 'Últimos 3 meses':
      start = subMonths(now, 3);
      end = now;
      break;
    case 'Últimos 6 meses':
      start = subMonths(now, 6);
      end = now;
      break;
    default:
      start = startOfWeek(now, { locale: es });
      end = endOfWeek(now, { locale: es });
  }

  const days = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));
  
  return { start, end, days };
}

// Export all data as JSON
export function exportJSON(): string {
  const state = getState();
  return JSON.stringify(state, null, 2);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidWeightEntry(e: unknown): e is WeightEntry {
  if (!e || typeof e !== 'object') return false;
  const { date, kg } = e as Record<string, unknown>;
  return typeof date === 'string' && ISO_DATE_RE.test(date) &&
    typeof kg === 'number' && kg > 0 && kg < 500;
}

function isValidStepsEntry(e: unknown): e is StepsEntry {
  if (!e || typeof e !== 'object') return false;
  const { date, steps } = e as Record<string, unknown>;
  return typeof date === 'string' && ISO_DATE_RE.test(date) &&
    typeof steps === 'number' && steps >= 0 && steps < 200000;
}

function isValidProfile(p: unknown): p is Partial<Profile> {
  if (!p || typeof p !== 'object') return false;
  const { weightUnit, height, kcalPerStep } = p as Record<string, unknown>;
  if (weightUnit !== undefined && weightUnit !== 'kg' && weightUnit !== 'lb') return false;
  if (height !== undefined && (typeof height !== 'number' || height < 50 || height > 300)) return false;
  if (kcalPerStep !== undefined && (typeof kcalPerStep !== 'number' || kcalPerStep < 0 || kcalPerStep > 1)) return false;
  return true;
}

function isValidGoals(g: unknown): g is Partial<Goals> {
  if (!g || typeof g !== 'object') return false;
  const { dailyCalories, protein, fat, carbs } = g as Record<string, unknown>;
  if (dailyCalories !== undefined && (typeof dailyCalories !== 'number' || dailyCalories < 0 || dailyCalories > 20000)) return false;
  if (protein !== undefined && (typeof protein !== 'number' || protein < 0 || protein > 2000)) return false;
  if (fat !== undefined && (typeof fat !== 'number' || fat < 0 || fat > 2000)) return false;
  if (carbs !== undefined && (typeof carbs !== 'number' || carbs < 0 || carbs > 2000)) return false;
  return true;
}

// Import and merge JSON data
export function importJSON(jsonString: string): boolean {
  try {
    const raw: unknown = JSON.parse(jsonString);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const imported = raw as Record<string, unknown>;

    // Merge weight data
    if (imported.analyticsWeight !== undefined) {
      if (!Array.isArray(imported.analyticsWeight)) return false;
      const validEntries = imported.analyticsWeight.filter(isValidWeightEntry);
      const current = getState().analyticsWeight;
      const merged = [...current];
      validEntries.forEach(entry => {
        const index = merged.findIndex(e => e.date === entry.date);
        if (index >= 0) merged[index] = entry;
        else merged.push(entry);
      });
      merged.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem('analyticsWeight', JSON.stringify(merged));
    }

    // Merge steps data
    if (imported.analyticsSteps !== undefined) {
      if (!Array.isArray(imported.analyticsSteps)) return false;
      const validEntries = imported.analyticsSteps.filter(isValidStepsEntry);
      const current = getState().analyticsSteps;
      const merged = [...current];
      validEntries.forEach(entry => {
        const index = merged.findIndex(e => e.date === entry.date);
        if (index >= 0) merged[index] = entry;
        else merged.push(entry);
      });
      merged.sort((a, b) => a.date.localeCompare(b.date));
      localStorage.setItem('analyticsSteps', JSON.stringify(merged));
    }

    // Merge other data
    if (imported.profile !== undefined) {
      if (!isValidProfile(imported.profile)) return false;
      localStorage.setItem('profile', JSON.stringify({ ...getState().profile, ...imported.profile }));
    }
    if (imported.goals !== undefined) {
      if (!isValidGoals(imported.goals)) return false;
      localStorage.setItem('goals', JSON.stringify({ ...getState().goals, ...imported.goals }));
    }
    if (imported.meals !== undefined) {
      if (!Array.isArray(imported.meals)) return false;
      localStorage.setItem('meals', JSON.stringify(imported.meals));
    }
    if (imported.recipes !== undefined) {
      if (!Array.isArray(imported.recipes)) return false;
      localStorage.setItem('recipes', JSON.stringify(imported.recipes));
    }

    return true;
  } catch {
    return false;
  }
}

// Save profile
export function saveProfile(partial: Partial<Profile>) {
  const current = getState().profile;
  localStorage.setItem('profile', JSON.stringify({ ...current, ...partial }));
}

// Save goals
export function saveGoals(partial: Partial<Goals>) {
  const current = getState().goals;
  localStorage.setItem('goals', JSON.stringify({ ...current, ...partial }));
}
