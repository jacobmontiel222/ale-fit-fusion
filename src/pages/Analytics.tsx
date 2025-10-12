import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";

const Analytics = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">Analytics</h1>
        <StatsCard>
          <p className="text-center text-muted-foreground py-8">
            Próximamente: estadísticas y análisis detallados
          </p>
        </StatsCard>
      </div>
      <BottomNav />
    </div>
  );
};

export default Analytics;
