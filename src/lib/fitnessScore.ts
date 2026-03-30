import type { FitnessScoreBreakdown, WeeklyFitnessScore } from '@/types/gamification';

// Score weights (must sum to 1.0)
const WEIGHTS = {
  nutrition:   0.50,
  training:    0.25,
  activity:    0.15,
  consistency: 0.10,
} as const;

// ── Nutrition (calorie + protein adherence combined) ────────────────────────

export interface NutritionInput {
  /** Average daily calorie consumed / goal ratio for the week (e.g. 0.95 = 95%) */
  avgCalorieAdherence: number;
  /** Average daily protein consumed / goal ratio for the week */
  avgProteinAdherence: number;
}

export function calculateNutritionScore(input: NutritionInput): number {
  const calorieScore = adherenceToScore(input.avgCalorieAdherence);
  const proteinScore = adherenceToScore(input.avgProteinAdherence);
  // Calorie adherence weighted slightly more than protein
  return Math.round(calorieScore * 0.6 + proteinScore * 0.4);
}

/**
 * Converts an adherence ratio to a 0–100 score.
 * - 0.90–1.15 → 100 (sweet spot)
 * - Below 0.90 → linear falloff to 0
 * - Above 1.15 → steep falloff (over-eating penalty)
 */
function adherenceToScore(ratio: number): number {
  if (ratio <= 0) return 0;
  if (ratio >= 0.9 && ratio <= 1.15) return 100;
  if (ratio < 0.9) return Math.round((ratio / 0.9) * 100);
  return Math.max(0, Math.round(100 - (ratio - 1.15) * 200));
}

// ── Training ────────────────────────────────────────────────────────────────

export interface TrainingInput {
  completedSessions: number;
  plannedSessions: number;
}

export function calculateTrainingScore(input: TrainingInput): number {
  if (input.plannedSessions <= 0) return 50; // neutral if no plan set
  const ratio = input.completedSessions / input.plannedSessions;
  return Math.min(100, Math.round(ratio * 100));
}

// ── Daily Activity (steps preferred) ────────────────────────────────────────

export interface ActivityInput {
  avgDailySteps: number;
  stepGoal: number;
}

export function calculateActivityScore(input: ActivityInput): number {
  if (input.stepGoal <= 0) return 50; // neutral if no goal set
  const ratio = input.avgDailySteps / input.stepGoal;
  return Math.min(100, Math.round(ratio * 100));
}

// ── Consistency ──────────────────────────────────────────────────────────────

export interface ConsistencyInput {
  /** Days (0–7) that had at least one meal logged */
  daysWithFoodLog: number;
  /** Days (0–7) that had at least one workout logged */
  daysWithWorkout: number;
  /** Days (0–7) that had a weight entry */
  daysWithWeightLog: number;
}

export function calculateConsistencyScore(input: ConsistencyInput): number {
  const food    = (input.daysWithFoodLog    / 7) * 100;
  const workout = (input.daysWithWorkout    / 7) * 100;
  const weight  = (input.daysWithWeightLog  / 7) * 100;
  // Food logging weighted most; workout second; weight third
  return Math.round(food * 0.5 + workout * 0.35 + weight * 0.15);
}

// ── Weekly composite ─────────────────────────────────────────────────────────

export interface WeeklyFitnessInput {
  nutrition:   NutritionInput;
  training:    TrainingInput;
  activity:    ActivityInput;
  consistency: ConsistencyInput;
  weekStart: string; // ISO date
  weekEnd:   string; // ISO date
}

export function calculateWeeklyFitnessScore(input: WeeklyFitnessInput): WeeklyFitnessScore {
  const breakdown: FitnessScoreBreakdown = {
    nutrition:   calculateNutritionScore(input.nutrition),
    training:    calculateTrainingScore(input.training),
    activity:    calculateActivityScore(input.activity),
    consistency: calculateConsistencyScore(input.consistency),
  };

  const total = Math.round(
    breakdown.nutrition   * WEIGHTS.nutrition   +
    breakdown.training    * WEIGHTS.training    +
    breakdown.activity    * WEIGHTS.activity    +
    breakdown.consistency * WEIGHTS.consistency
  );

  return { total, breakdown, weekStart: input.weekStart, weekEnd: input.weekEnd };
}
