import { cn } from "@/lib/utils";

type FitAILogoProps = {
  className?: string;
};

export const FitAILogo = ({ className }: FitAILogoProps) => {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground shadow-sm transition-transform duration-200 hover:scale-105",
        className
      )}
    >
      <span className="text-xs font-semibold tracking-wide">AI</span>
    </span>
  );
};

export default FitAILogo;
