import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  children: ReactNode;
  className?: string;
}

export const StatsCard = ({ children, className = "" }: StatsCardProps) => {
  return (
    <Card className={`bg-card border-none rounded-3xl p-6 ${className}`}>
      {children}
    </Card>
  );
};
