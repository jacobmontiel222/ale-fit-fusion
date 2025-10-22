import { X, ChevronRight, Download, Upload, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { getState, exportJSON, importJSON } from "@/lib/storage";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AvatarSelector } from "@/components/AvatarSelector";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useTheme } from "next-themes";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";

interface ProfileData {
  name: string;
  height: number | null;
  current_weight: number | null;
  target_weight: number | null;
  avatar_icon: string;
  avatar_color: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const state = getState();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ProfileData>({
    name: "Usuario",
    height: null,
    current_weight: null,
    target_weight: null,
    avatar_icon: 'apple',
    avatar_color: '#10B981'
  });
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [smartReminders, setSmartReminders] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { profile, updateProfile, isUpdating } = useProfile();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (profile) {
      setEditData(profile);
    }
  }, [profile]);

  const handleEditProfile = () => {
    setIsEditing(true);
    if (profile) {
      setEditData(profile);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profile) {
      setEditData(profile);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    try {
      await updateProfile(editData);
      setIsEditing(false);
      toast.success(t('profile.profileUpdated'));
    } catch (error) {
      toast.error(t('profile.updateError'));
      console.error(error);
    }
  };

  const handleAvatarSelect = (icon: string, color: string) => {
    setEditData({ ...editData, avatar_icon: icon, avatar_color: color });
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
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
    toast.success(t('profile.dataExported'));
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
            toast.success(t('profile.dataImported'));
            window.location.reload();
          } else {
            toast.error(t('profile.importError'));
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
          <h1 className="text-2xl font-bold text-foreground">{t('profile.title')}</h1>
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
            <ProfileAvatar 
              icon={isEditing ? editData.avatar_icon : (profile?.avatar_icon || 'apple')}
              color={isEditing ? editData.avatar_color : (profile?.avatar_color || '#10B981')}
              size="lg"
            />
            {isEditing && (
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Pencil className="w-4 h-4 text-primary-foreground" />
              </button>
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {profile?.name || 'Usuario'}
          </h2>
          <p className="text-muted-foreground mb-4">{t('profile.motto')}</p>
          {!isEditing ? (
            <Button variant="secondary" className="w-48" onClick={handleEditProfile}>
              {t('profile.editProfile')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" className="w-24" onClick={handleCancelEdit}>
                {t('profile.cancel')}
              </Button>
              <Button variant="default" className="w-24" onClick={handleSaveProfile} disabled={isUpdating}>
                {isUpdating ? t('profile.saving') : t('profile.save')}
              </Button>
            </div>
          )}
        </div>

        {/* Información personal */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('profile.personalInfo')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.height')}</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editData.height || ""}
                    onChange={(e) => setEditData({ ...editData, height: e.target.value ? Number(e.target.value) : null })}
                    className="w-20 h-8 text-right"
                    placeholder="0"
                  />
                  <span className="text-muted-foreground">{t('profile.cm')}</span>
                </div>
               ) : (
                <span className="text-muted-foreground">{profile?.height || 0} {t('profile.cm')}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.currentWeight')}</span>
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
                  <span className="text-muted-foreground">{t('profile.kg')}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">{profile?.current_weight || 0} {t('profile.kg')}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.targetWeight')}</span>
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
                  <span className="text-muted-foreground">{t('profile.kg')}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">{profile?.target_weight || 0} {t('profile.kg')}</span>
              )}
            </div>
          </div>
        </StatsCard>

        {/* Preferencias de la aplicación */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('profile.appPreferences')}</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="dark-mode" className="text-foreground cursor-pointer">{t('profile.darkMode')}</Label>
              <Switch 
                id="dark-mode" 
                checked={mounted ? theme === 'dark' : false} 
                onCheckedChange={handleThemeToggle}
                disabled={!mounted}
              />
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="notifications" className="text-foreground cursor-pointer">{t('profile.notifications')}</Label>
              <Switch id="notifications" checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="smart-reminders" className="text-foreground cursor-pointer">{t('profile.smartReminders')}</Label>
              <Switch id="smart-reminders" checked={smartReminders} onCheckedChange={setSmartReminders} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.units')}</span>
              <span className="text-muted-foreground">{state.profile.weightUnit === 'kg' ? t('profile.metric') : t('profile.imperial')}</span>
            </div>
            <button 
              className="w-full flex justify-between items-center text-left"
              onClick={() => setShowLanguageSelector(true)}
            >
              <span className="text-foreground">{t('profile.language')}</span>
              <span className="text-muted-foreground">{t(`languages.${i18n.language}`)}</span>
            </button>
          </div>
        </StatsCard>

        {/* Cuenta y seguridad */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('profile.accountSecurity')}</h3>
          <div className="space-y-4">
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.changeEmail')}</span>
              <span className="text-muted-foreground text-sm">{user?.email || ''}</span>
            </button>
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.changePassword')}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex justify-between items-center">
              <Label htmlFor="biometric" className="text-foreground cursor-pointer">{t('profile.biometric')}</Label>
              <Switch id="biometric" checked={biometricAuth} onCheckedChange={setBiometricAuth} />
            </div>
          </div>
        </StatsCard>

        {/* Sincronización y datos */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('profile.syncData')}</h3>
          <div className="space-y-4">
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.connectHealth')}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={handleExport} className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.exportData')}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex justify-between items-center">
              <Label htmlFor="auto-backup" className="text-foreground cursor-pointer">{t('profile.autoBackup')}</Label>
              <Switch id="auto-backup" checked={autoBackup} onCheckedChange={setAutoBackup} />
            </div>
          </div>
        </StatsCard>

        {/* Ayuda y soporte */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('profile.helpSupport')}</h3>
          <div className="space-y-4">
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.faq')}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.contactSupport')}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.reportBug')}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </StatsCard>

        {/* Legal */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('profile.legal')}</h3>
          <div className="space-y-4">
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.privacyPolicy')}</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="w-full flex justify-between items-center text-left">
              <span className="text-foreground">{t('profile.terms')}</span>
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
            toast.success(t('profile.logoutSuccess'));
          }}
        >
          {t('profile.logout')}
        </Button>
      </div>

      <AvatarSelector
        open={showAvatarSelector}
        onOpenChange={setShowAvatarSelector}
        currentIcon={editData.avatar_icon}
        currentColor={editData.avatar_color}
        onSelect={handleAvatarSelect}
      />
      
      <LanguageSelector
        open={showLanguageSelector}
        onOpenChange={setShowLanguageSelector}
      />
    </div>
  );
};

export default Profile;
