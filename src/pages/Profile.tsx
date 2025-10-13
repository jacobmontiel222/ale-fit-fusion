import { ArrowLeft, Download, Upload, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { useState, useEffect } from "react";
import { getState, exportJSON, importJSON } from "@/lib/storage";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Profile = () => {
  const navigate = useNavigate();
  const [state, setState] = useState(getState());
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    setState(getState());
  }, []);

  const handleExport = () => {
    const data = exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Datos exportados correctamente');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const success = importJSON(content);
          if (success) {
            toast.success('Datos importados correctamente');
            setState(getState());
          } else {
            toast.error('Error al importar datos');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-card rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-3xl font-bold text-foreground">Perfil</h1>
        </div>

        {/* Local Data Section */}
        <StatsCard>
          <h2 className="text-xl font-semibold text-foreground mb-4">Datos locales</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nombre</span>
              <span className="text-foreground font-semibold">
                {state.profile.name || 'No establecido'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unidad de peso</span>
              <span className="text-foreground font-semibold">{state.profile.weightUnit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Altura</span>
              <span className="text-foreground font-semibold">
                {state.profile.height ? `${state.profile.height} cm` : 'No establecido'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Objetivo kcal</span>
              <span className="text-foreground font-semibold">
                {state.goals.dailyCalories} kcal
              </span>
            </div>
          </div>
        </StatsCard>

        {/* Account Section */}
        <StatsCard>
          <h2 className="text-xl font-semibold text-foreground mb-4">Cuenta (futuro)</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowLoginDialog(true)}
            >
              <User className="w-4 h-4 mr-2" />
              Iniciar sesión / Crear cuenta
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar datos
              </Button>
              <Button variant="outline" onClick={handleImport}>
                <Upload className="w-4 h-4 mr-2" />
                Importar datos
              </Button>
            </div>
          </div>
        </StatsCard>
      </div>

      {/* Login Dialog */}
      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Próximamente</AlertDialogTitle>
            <AlertDialogDescription>
              Tus datos se guardan localmente de forma segura. Pronto podrás crear una cuenta para sincronizar tus datos en la nube.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button onClick={() => setShowLoginDialog(false)}>Entendido</Button>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Profile;
