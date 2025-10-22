import { Progress } from "@/components/ui/progress";
import { useMicronutrients } from "@/hooks/useMicronutrients";
import { Loader2 } from "lucide-react";

interface MicronutrientsListProps {
  date: string;
}

export const MicronutrientsList = ({ date }: MicronutrientsListProps) => {
  const { micronutrients, loading, hasMeals } = useMicronutrients(date);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasMeals) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Añade comidas para ver tus micronutrientes
      </div>
    );
  }

  if (micronutrients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="mb-2">No hay datos de micronutrientes</p>
        <p className="text-sm">
          Los alimentos de tu base de datos local contienen información completa de vitaminas y minerales
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {micronutrients.map((micro, index) => {
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
