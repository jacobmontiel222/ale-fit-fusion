import { Apple, Bike, Dumbbell, Salad, UtensilsCrossed, Carrot, Beef, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AVATAR_ICONS = [
  { id: 'apple', Icon: Apple, label: 'Manzana' },
  { id: 'salad', Icon: Salad, label: 'Bowl' },
  { id: 'bike', Icon: Bike, label: 'Bicicleta' },
  { id: 'carrot', Icon: Carrot, label: 'Zanahoria' },
  { id: 'dumbbell', Icon: Dumbbell, label: 'Pesas' },
  { id: 'beef', Icon: Beef, label: 'Carne' },
  { id: 'clipboard', Icon: ClipboardList, label: 'Lista' },
  { id: 'utensils', Icon: UtensilsCrossed, label: 'Cubiertos' },
] as const;

const AVATAR_COLORS = [
  { hex: '#111827', name: 'Graphite' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#10B981', name: 'Green' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#6B7280', name: 'Slate' },
] as const;

interface AvatarSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIcon: string;
  currentColor: string;
  onSelect: (icon: string, color: string) => void;
}

export const AvatarSelector = ({ 
  open, 
  onOpenChange, 
  currentIcon, 
  currentColor, 
  onSelect 
}: AvatarSelectorProps) => {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [step, setStep] = useState<'icon' | 'color'>('icon');

  const handleIconSelect = (iconId: string) => {
    setSelectedIcon(iconId);
    setStep('color');
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  const handleConfirm = () => {
    onSelect(selectedIcon, selectedColor);
    onOpenChange(false);
    setStep('icon');
  };

  const handleBack = () => {
    setStep('icon');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) setStep('icon');
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'icon' ? 'Elige tu icono' : 'Elige tu color'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'icon' ? (
          <div className="grid grid-cols-4 gap-4 py-4">
            {AVATAR_ICONS.map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => handleIconSelect(id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent ${
                  selectedIcon === id ? 'border-primary bg-accent' : 'border-border'
                }`}
                aria-label={label}
              >
                <Icon className="w-8 h-8" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center py-6">
              {(() => {
                const iconData = AVATAR_ICONS.find(i => i.id === selectedIcon);
                const IconComponent = iconData?.Icon || Apple;
                return (
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center border-2"
                    style={{ 
                      backgroundColor: 'transparent',
                      borderColor: selectedColor
                    }}
                  >
                    <IconComponent 
                      className="w-16 h-16" 
                      style={{ color: selectedColor }}
                      fill={selectedColor}
                    />
                  </div>
                );
              })()}
            </div>
            
            <div className="grid grid-cols-4 gap-4 py-4">
              {AVATAR_COLORS.map(({ hex, name }) => (
                <button
                  key={hex}
                  onClick={() => handleColorSelect(hex)}
                  className={`w-full aspect-square rounded-lg border-2 transition-all ${
                    selectedColor === hex ? 'border-foreground scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: hex }}
                  aria-label={name}
                />
              ))}
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Atrás
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Confirmar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const getAvatarIcon = (iconId: string) => {
  const icon = AVATAR_ICONS.find(i => i.id === iconId);
  return icon?.Icon || Apple;
};
