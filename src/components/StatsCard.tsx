import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const StatsCard = ({ children, className = "", ...props }: StatsCardProps) => {
  return (
    <Card className={`bg-card border-none rounded-3xl p-6 ${className}`} {...props}>
      {children}
    </Card>
  );
};
