import { useEffect, useState } from "react";

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  proteinGoal?: number;
  fatGoal?: number;
  carbsGoal?: number;
}

export const CircularProgress = ({ 
  value, 
  max, 
  size = 140, 
  strokeWidth = 12,
  protein = 0,
  fat = 0,
  carbs = 0,
  proteinGoal = 1,
  fatGoal = 1,
  carbsGoal = 1,
}: CircularProgressProps) => {
  const [animatedProtein, setAnimatedProtein] = useState(0);
  const [animatedFat, setAnimatedFat] = useState(0);
  const [animatedCarbs, setAnimatedCarbs] = useState(0);
  const [animatedValue, setAnimatedValue] = useState(0);
  
  // Animate the values smoothly when they change
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedProtein(protein);
      setAnimatedFat(fat);
      setAnimatedCarbs(carbs);
      setAnimatedValue(value);
    }, 50);
    
    return () => clearTimeout(timeout);
  }, [protein, fat, carbs, value]);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = (animatedValue / max) * 100;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Calculate macro percentages with animated values
  const proteinPercentage = Math.min(100, (animatedProtein / proteinGoal) * 100);
  const fatPercentage = Math.min(100, (animatedFat / fatGoal) * 100);
  const carbsPercentage = Math.min(100, (animatedCarbs / carbsGoal) * 100);
  
  // Calculate segments for the colored ring
  const totalMacros = proteinGoal + fatGoal + carbsGoal;
  const proteinSegment = (proteinGoal / totalMacros) * circumference;
  const fatSegment = (fatGoal / totalMacros) * circumference;
  const carbsSegment = (carbsGoal / totalMacros) * circumference;
  
  const proteinOffset = circumference - (proteinPercentage / 100) * proteinSegment;
  const fatOffset = circumference - (fatPercentage / 100) * fatSegment;
  const carbsOffset = circumference - (carbsPercentage / 100) * carbsSegment;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--progress-bg))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Protein segment (green) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--protein))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${proteinSegment} ${circumference - proteinSegment}`}
          strokeDashoffset={proteinOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        
        {/* Fat segment (yellow) - offset by protein segment */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--fat))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${fatSegment} ${circumference - fatSegment}`}
          strokeDashoffset={fatOffset - proteinSegment}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        
        {/* Carbs segment (blue) - offset by protein + fat segments */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--carbs))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${carbsSegment} ${circumference - carbsSegment}`}
          strokeDashoffset={carbsOffset - proteinSegment - fatSegment}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground transition-all duration-500">{animatedValue}</span>
        <span className="text-sm text-muted-foreground">Kcal</span>
      </div>
    </div>
  );
};
