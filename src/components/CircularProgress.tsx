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
  
  // Convert macros to kcal: protein and carbs = 4 kcal/g, fat = 9 kcal/g
  const proteinKcal = animatedProtein * 4;
  const fatKcal = animatedFat * 9;
  const carbsKcal = animatedCarbs * 4;
  
  // Calculate how much of the circle each macro should fill (based on kcal consumed vs total kcal goal)
  const proteinArcLength = (proteinKcal / max) * circumference;
  const fatArcLength = (fatKcal / max) * circumference;
  const carbsArcLength = (carbsKcal / max) * circumference;
  
  // Calculate offsets so arcs appear sequentially (protein first, then fat, then carbs)
  const proteinOffset = circumference - proteinArcLength;
  const fatOffset = circumference - fatArcLength;
  const carbsOffset = circumference - carbsArcLength;

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
        
        {/* Protein arc (green) - starts at 0 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--protein))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={proteinOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
        
        {/* Fat arc (yellow) - starts after protein */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--fat))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={fatOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            transform: `rotate(${(proteinKcal / max) * 360}deg)`,
            transformOrigin: 'center',
          }}
        />
        
        {/* Carbs arc (blue) - starts after protein + fat */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--carbs))"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={carbsOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            transform: `rotate(${((proteinKcal + fatKcal) / max) * 360}deg)`,
            transformOrigin: 'center',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-foreground transition-all duration-500">{animatedValue}</span>
        <span className="text-sm text-muted-foreground">Kcal</span>
      </div>
    </div>
  );
};
