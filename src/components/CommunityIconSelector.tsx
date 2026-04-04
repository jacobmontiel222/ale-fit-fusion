import {
  Dumbbell, Flame, Heart, Trophy, Zap, Users, Target, Timer,
  Bike, Mountain, Shield, Sun, Activity, Waves, Wind, Swords,
  Footprints, Apple, Salad, PersonStanding,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const COMMUNITY_ICON_LIST = [
  { id: "dumbbell",       Icon: Dumbbell,       label: "Pesas"       },
  { id: "flame",          Icon: Flame,          label: "Intensidad"  },
  { id: "heart",          Icon: Heart,          label: "Salud"       },
  { id: "trophy",         Icon: Trophy,         label: "Competición" },
  { id: "zap",            Icon: Zap,            label: "HIIT"        },
  { id: "users",          Icon: Users,          label: "Comunidad"   },
  { id: "target",         Icon: Target,         label: "Objetivos"   },
  { id: "timer",          Icon: Timer,          label: "Resistencia" },
  { id: "bike",           Icon: Bike,           label: "Ciclismo"    },
  { id: "mountain",       Icon: Mountain,       label: "Senderismo"  },
  { id: "shield",         Icon: Shield,         label: "Fuerza"      },
  { id: "sun",            Icon: Sun,            label: "Yoga"        },
  { id: "activity",       Icon: Activity,       label: "Cardio"      },
  { id: "waves",          Icon: Waves,          label: "Natación"    },
  { id: "wind",           Icon: Wind,           label: "Running"     },
  { id: "swords",         Icon: Swords,         label: "Artes Marciales" },
  { id: "footprints",     Icon: Footprints,     label: "Pasos"       },
  { id: "apple",          Icon: Apple,          label: "Nutrición"   },
  { id: "salad",          Icon: Salad,          label: "Dieta"       },
  { id: "personstanding", Icon: PersonStanding, label: "Postura"     },
] as const;

export const COMMUNITY_COLORS = [
  { hex: '#10B981', name: 'Green'   },
  { hex: '#0EA5E9', name: 'Sky'     },
  { hex: '#EF4444', name: 'Red'     },
  { hex: '#F59E0B', name: 'Amber'   },
  { hex: '#8B5CF6', name: 'Violet'  },
  { hex: '#14B8A6', name: 'Teal'    },
  { hex: '#F97316', name: 'Orange'  },
  { hex: '#6B7280', name: 'Slate'   },
] as const;

export const getCommunityIcon = (iconId: string) => {
  const found = COMMUNITY_ICON_LIST.find(i => i.id === iconId);
  return found?.Icon ?? Dumbbell;
};

interface CommunityIconSelectorProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  currentIcon:  string;
  currentColor: string;
  onSelect:     (icon: string, color: string) => void;
}

export const CommunityIconSelector = ({
  open, onOpenChange, currentIcon, currentColor, onSelect,
}: CommunityIconSelectorProps) => {
  const [selectedIcon,  setSelectedIcon]  = useState(currentIcon);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [step, setStep] = useState<"icon" | "color">("icon");

  const handleIconSelect = (id: string) => { setSelectedIcon(id); setStep("color"); };
  const handleConfirm    = () => { onSelect(selectedIcon, selectedColor); onOpenChange(false); setStep("icon"); };
  const handleBack       = () => setStep("icon");

  const PreviewIcon = getCommunityIcon(selectedIcon);

  return (
    <Dialog open={open} onOpenChange={isOpen => { onOpenChange(isOpen); if (!isOpen) setStep("icon"); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{step === "icon" ? "Elige un icono" : "Elige un color"}</DialogTitle>
        </DialogHeader>

        {step === "icon" ? (
          <div className="grid grid-cols-4 gap-3 py-4">
            {COMMUNITY_ICON_LIST.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => handleIconSelect(id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all hover:bg-accent ${
                  selectedIcon === id ? "border-primary bg-accent" : "border-border"
                }`}
                aria-label={label}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center py-6">
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center border-2"
                style={{ borderColor: selectedColor, backgroundColor: `${selectedColor}22` }}
              >
                <PreviewIcon className="w-12 h-12" style={{ color: selectedColor }} strokeWidth={1.5} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 py-2">
              {COMMUNITY_COLORS.map(({ hex, name }) => (
                <button
                  key={hex}
                  onClick={() => setSelectedColor(hex)}
                  className={`w-full aspect-square rounded-xl border-2 transition-all ${
                    selectedColor === hex ? "border-foreground scale-110" : "border-border"
                  }`}
                  style={{ backgroundColor: hex }}
                  aria-label={name}
                />
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">Atrás</Button>
              <Button onClick={handleConfirm} className="flex-1">Confirmar</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
