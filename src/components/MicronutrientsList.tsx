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

  return (
    <div className="space-y-3">
      {micronutrients.map((micro, index) => {
        const maxForBar = micro.max ?? Math.max(1, micro.value * 1.5);
        const percentage = Math.min(100, (micro.value / maxForBar) * 100);
        
        return (
          <div key={index} className="space-y-1.5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-foreground font-medium">{micro.label}</span>
              <span className="text-muted-foreground">
                {micro.value} {micro.unit}{micro.max ? ` / ${micro.max} ${micro.unit}` : ''}
              </span>
            </div>
            <Progress value={percentage} className="h-2 bg-secondary" indicatorClassName="bg-white" />
          </div>
        );
      })}
    </div>
  );
};
