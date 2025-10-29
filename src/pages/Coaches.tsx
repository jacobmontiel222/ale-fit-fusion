import { BottomNav } from "@/components/BottomNav";
import { StatsCard } from "@/components/StatsCard";
import { cn } from "@/lib/utils";
import { UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

const Coaches = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"
              )}
            >
              <UsersRound className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {t("coaches.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("coaches.subtitle")}
              </p>
            </div>
          </div>
        </header>

        <StatsCard className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {t("coaches.highlightsTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("coaches.description")}
            </p>
          </div>
        </StatsCard>
      </div>

      <BottomNav />
    </div>
  );
};

export default Coaches;
