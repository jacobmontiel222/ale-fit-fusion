import { X, ChevronRight, Download, Upload, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { getState, exportJSON, importJSON } from "@/lib/storage";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  name: string;
  height: number | null;
  current_weight: number | null;
  target_weight: number | null;
  avatar_url: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const state = getState();
  
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "Usuario",
    height: null,
    current_weight: null,
    target_weight: null,
    avatar_url: null
  });
  const [editData, setEditData] = useState<ProfileData>({
    name: "Usuario",
    height: null,
    current_weight: null,
    target_weight: null,
    avatar_url: null
  });
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [smartReminders, setSmartReminders] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      // 1) Read name from session metadata first
      const { data: authData } = await supabase.auth.getUser();
      const metaName = authData.user?.user_metadata?.name as string | undefined;
      if (metaName && metaName.trim().length > 0) {
        setProfileData((p) => ({ ...p, name: metaName }));
        setEditData((p) => ({ ...p, name: metaName }));
      }

      // 2) Try profiles table for persisted fields (and name override if present)
      const uid = authData.user?.id || user?.id;
      if (uid) {
        const { data } = await supabase
          .from('profiles')
          .select('name, height, current_weight, target_weight, avatar_url')
          .eq('id', uid)
          .maybeSingle();

        if (data) {
          const profile = {
            name: data.name || metaName || 'Usuario',
            height: data.height ?? null,
            current_weight: data.current_weight ?? null,
            target_weight: data.target_weight ?? null,
            avatar_url: data.avatar_url ?? null,
          };
          setProfileData(profile);
          setEditData(profile);
        }
      }
    };

    loadProfile();
  }, [user?.id]);

  const handleEditProfile = () => {
    setIsEditing(true);
    setEditData(profileData);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData(profileData);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        height: editData.height,
        current_weight: editData.current_weight,
        target_weight: editData.target_weight,
        avatar_url: editData.avatar_url
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Error al guardar los cambios');
      console.error(error);
    } else {
      setProfileData(editData);
      setIsEditing(false);
      toast.success('Perfil actualizado correctamente');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData({ ...editData, avatar_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

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
            window.location.reload();
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
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1" />
          <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-card rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-foreground" />
            </button>
          </div>
        </div>

        {/* Avatar and User Info */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <Avatar className="w-28 h-28">
              <AvatarImage src={isEditing ? editData.avatar_url || "" : profileData.avatar_url || ""} />
              <AvatarFallback className="bg-muted text-foreground text-3xl">
                {profileData.name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <label 
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {profileData.name}
          </h2>
          <p className="text-muted-foreground mb-4">Vamos a por ello</p>
          {!isEditing ? (
            <Button variant="secondary" className="w-48" onClick={handleEditProfile}>
              Editar perfil
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" className="w-24" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button variant="default" className="w-24" onClick={handleSaveProfile}>
                Guardar
              </Button>
            </div>
          )}
        </div>

        {/* Información personal */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Información personal</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-foreground">Altura</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editData.height || ""}
                    onChange={(e) => setEditData({ ...editData, height: e.target.value ? Number(e.target.value) : null })}
                    className="w-20 h-8 text-right"
                    placeholder="0"
                  />
                  <span className="text-muted-foreground">cm</span>
                </div>
              ) : (
                <span className="text-muted-foreground">{profileData.height || 0} cm</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">Peso actual</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={editData.current_weight || ""}
                    onChange={(e) => setEditData({ ...editData, current_weight: e.target.value ? Number(e.target.value) : null })}
                    className="w-20 h-8 text-right"
                    placeholder="0"
                  />
                  <span className="text-muted-foreground">kg</span>
                </div>
              ) : (
                <span className="text-muted-foreground">{profileData.current_weight || 0} kg</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">Peso objetivo</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={editData.target_weight || ""}
                    onChange={(e) => setEditData({ ...editData, target_weight: e.target.value ? Number(e.target.value) : null })}
                    className="w-20 h-8 text-right"
                    placeholder="0"
                  />
                  <span className="text-muted-foreground">kg</span>
                </div>
              ) : (
                <span className="text-muted-foreground">{profileData.target_weight || 0} kg</span>
              )}
            </div>
          </div>
        </StatsCard>

        {/* Preferencias de la aplicación */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Preferencias de la aplicación</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="dark-mode" className="text-foreground cursor-pointer">Modo oscuro</Label>
              <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="notifications" className="text-foreground cursor-pointer">Notificaciones</Label>
              <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="smart-reminders" className="text-foreground cursor-pointer">Recordatorios inteligentes</Label>
              <Switch id="smart-reminders" checked={smartReminders} onCheckedChange={setSmartReminders} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">Unidades</span>
              <span className="text-muted-foreground">{state.profile.weightUnit === 'kg' ? 'Métrico' : 'Imperial'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">Idioma</span>
              <span className="text-muted-foreground">Español</span>
            </div>
          </div>
        </StatsCard>

        {/* Cuenta y seguridad */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Cuenta y seguridad</h3>
          <div className="space-y-4">
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">Cambiar email</span>
              <span className="text-muted-foreground text-sm">{user?.email || ''}</span>
            </button>
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">Cambiar contraseña</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex justify-between items-center">
              <Label htmlFor="biometric" className="text-foreground cursor-pointer">Face ID / Touch ID</Label>
              <Switch id="biometric" checked={biometricAuth} onCheckedChange={setBiometricAuth} />
            </div>
          </div>
        </StatsCard>

        {/* Sincronización y datos */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Sincronización y datos</h3>
          <div className="space-y-4">
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">Conectar con Google Fit / Apple Health</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={handleExport} className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">Exportar datos</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex justify-between items-center">
              <Label htmlFor="auto-backup" className="text-foreground cursor-pointer">Copia de seguridad automática</Label>
              <Switch id="auto-backup" checked={autoBackup} onCheckedChange={setAutoBackup} />
            </div>
          </div>
        </StatsCard>

        {/* Ayuda y soporte */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Ayuda y soporte</h3>
          <div className="space-y-4">
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">FAQ / Centro de ayuda</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">Contactar soporte</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">Informar de un bug</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </StatsCard>

        {/* Legal */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">Legal</h3>
          <div className="space-y-4">
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">Política de privacidad</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">Términos de servicio</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </StatsCard>

        {/* Cerrar sesión */}
        <Button 
          variant="destructive" 
          className="w-full mt-6"
          onClick={async () => {
            await signOut();
            toast.success('Sesión cerrada exitosamente');
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
};

export default Profile;
