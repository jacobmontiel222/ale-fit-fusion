import { Progress } from "@/components/ui/progress";

interface Micronutrient {
  name: string;
  current: number;
  goal: number;
  unit: string;
}

const mockMicronutrients: Micronutrient[] = [
  // Vitaminas
  { name: "Vitamina A", current: 650, goal: 900, unit: "µg" },
  { name: "Vitamina B1 (Tiamina)", current: 1.0, goal: 1.2, unit: "mg" },
  { name: "Vitamina B2 (Riboflavina)", current: 1.1, goal: 1.3, unit: "mg" },
  { name: "Vitamina B3 (Niacina)", current: 12, goal: 16, unit: "mg" },
  { name: "Vitamina B5", current: 4, goal: 5, unit: "mg" },
  { name: "Vitamina B6", current: 1.2, goal: 1.7, unit: "mg" },
  { name: "Vitamina B7 (Biotina)", current: 25, goal: 30, unit: "µg" },
  { name: "Vitamina B9 (Ácido fólico)", current: 320, goal: 400, unit: "µg" },
  { name: "Vitamina B12", current: 2.0, goal: 2.4, unit: "µg" },
  { name: "Vitamina C", current: 65, goal: 90, unit: "mg" },
  { name: "Vitamina D", current: 12, goal: 15, unit: "µg" },
  { name: "Vitamina E", current: 11, goal: 15, unit: "mg" },
  { name: "Vitamina K", current: 85, goal: 120, unit: "µg" },
  // Minerales
  { name: "Calcio", current: 850, goal: 1000, unit: "mg" },
  { name: "Magnesio", current: 280, goal: 400, unit: "mg" },
  { name: "Zinc", current: 9, goal: 11, unit: "mg" },
  { name: "Hierro", current: 12, goal: 18, unit: "mg" },
  { name: "Potasio", current: 2800, goal: 3500, unit: "mg" },
  { name: "Sodio", current: 1800, goal: 2300, unit: "mg" },
  { name: "Fósforo", current: 600, goal: 700, unit: "mg" },
  { name: "Selenio", current: 45, goal: 55, unit: "µg" },
  { name: "Cobre", current: 0.7, goal: 0.9, unit: "mg" },
  { name: "Manganeso", current: 1.8, goal: 2.3, unit: "mg" },
  // Otros
  { name: "Omega-3", current: 1.2, goal: 1.6, unit: "g" },
  { name: "Fibra", current: 22, goal: 30, unit: "g" },
  { name: "Colina", current: 380, goal: 550, unit: "mg" },
];

export const MicronutrientsList = () => {
  const hasMeals = localStorage.getItem("meals");

  if (!hasMeals || JSON.parse(hasMeals).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Añade comidas para ver tus micronutrientes
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mockMicronutrients.map((micro, index) => {
        const percentage = Math.min(100, (micro.current / micro.goal) * 100);
        
        return (
          <div key={index} className="space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground font-medium">{micro.name}</span>
              <span className="text-muted-foreground">
                {micro.current} / {micro.goal} {micro.unit}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">
              {percentage.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};
