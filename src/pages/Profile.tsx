import { X, ChevronRight, Pencil, ChevronDown } from "lucide-react";
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
import { AvatarSelector } from "@/components/AvatarSelector";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useTheme } from "next-themes";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Gamification
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGamification } from "@/hooks/useGamification";
import { useNewBadges } from "@/hooks/useNewBadges";
import { BADGE_CATALOG } from "@/config/badgeCatalog";
import { LevelCard } from "@/components/profile/LevelCard";
import { StreakCard } from "@/components/profile/StreakCard";
import { FitnessScoreCard } from "@/components/profile/FitnessScoreCard";
import { BadgesSection } from "@/components/profile/BadgesSection";
import { BadgeUnlockModal } from "@/components/profile/BadgeUnlockModal";
import { recalculateWeeklyScore, getISOWeekMonday } from "@/lib/weeklyScore";

interface ProfileData {
  name: string;
  height: number | null;
  current_weight: number | null;
  target_weight: number | null;
  avatar_icon: string;
  avatar_color: string;
  share_foods_with_community: boolean;
  water_goal_ml?: number | null;
  burn_goal_kcal?: number | null;
  calories_goal?: number | null;
  steps_goal?: number | null;
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
    avatar_color: '#10B981',
    share_foods_with_community: false,
    water_goal_ml: null,
    burn_goal_kcal: null,
    calories_goal: null,
    steps_goal: null,
  });
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [smartReminders, setSmartReminders] = useState(false);
  const [biometricAuth, setBiometricAuth] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [shareWithCommunity, setShareWithCommunity] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { profile, updateProfile, isUpdating } = useProfile();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const gamification = useGamification();
  const { currentBadge, dismissCurrent } = useNewBadges(gamification.unlockedBadges, gamification.isLoading);

  // ── Profile title selector ────────────────────────────────────────────────
  // All titles available to this user (from their unlocked badges)
  const unlockedTitles = BADGE_CATALOG
    .filter(b => b.unlocksTitle && gamification.unlockedBadges.some(ub => ub.badgeId === b.id))
    .map(b => b.unlocksTitle as string);

  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);

  // Sync selectedTitle when editing starts
  useEffect(() => {
    if (isEditing) setSelectedTitle(gamification.activeProfileTitle ?? null);
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProfileTitle(title: string | null) {
    if (!user?.id) return;
    setSavingTitle(true);
    try {
      await (supabase as any)
        .from('user_gamification')
        .update({ active_profile_title: title, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      queryClient.invalidateQueries({ queryKey: ['gamification', user.id] });
    } catch {
      toast.error('Could not save title');
    } finally {
      setSavingTitle(false);
    }
  }

  // Recompute the current week's fitness score on every profile visit so the
  // weekly_fitness_scores table stays fresh and badge/XP state is up to date.
  useEffect(() => {
    if (!user?.id) return;
    const weekStart = getISOWeekMonday();
    recalculateWeeklyScore(user.id, weekStart)
      .then(() => queryClient.invalidateQueries({ queryKey: ['gamification', user.id] }))
      .catch(() => {}); // non-critical; silently skip on network errors
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizeLang = (code: string) => {
    const lower = code.toLowerCase();
    if (lower === 'de-ch') return 'de-CH';
    return code.split('-')[0];
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (profile) setEditData(profile);
  }, [profile]);

  useEffect(() => {
    if (profile?.share_foods_with_community !== undefined && profile?.share_foods_with_community !== null) {
      setShareWithCommunity(profile.share_foods_with_community);
    } else {
      setShareWithCommunity(false);
    }
  }, [profile?.share_foods_with_community]);

  const handleEditProfile = () => {
    setIsEditing(true);
    if (profile) setEditData(profile);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profile) setEditData(profile);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    const trimmedName = (editData.name || '').trim();
    if (!trimmedName) {
      toast.error(t('profile.nameRequired'));
      return;
    }
    try {
      await updateProfile({ ...editData, name: trimmedName });
      await saveProfileTitle(selectedTitle);
      setEditData(prev => ({ ...prev, name: trimmedName }));
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

  const persistSharePreference = async (value: boolean) => {
    const previous = shareWithCommunity;
    setShareWithCommunity(value);
    try {
      await updateProfile({ share_foods_with_community: value });
      toast.success(value ? t('profile.shareWithCommunityEnabled') : t('profile.shareWithCommunityDisabled'));
    } catch (error) {
      console.error('Error updating share preference', error);
      setShareWithCommunity(previous);
      toast.error(t('profile.shareWithCommunityError'));
    }
  };

  const handleShareToggle = (checked: boolean) => {
    if (checked) setShowShareDialog(true);
    else persistSharePreference(false);
  };

  const handleConfirmShare = () => {
    setShowShareDialog(false);
    persistSharePreference(true);
  };

  const handleCancelShareDialog = () => {
    setShowShareDialog(false);
    setShareWithCommunity(false);
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

        {/* ── Identity ───────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-2">
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

          {/* Name */}
          {!isEditing ? (
            <h2 className="text-2xl font-bold text-foreground mb-0.5 text-center">
              {profile?.name || 'Usuario'}
            </h2>
          ) : (
            <div className="w-full max-w-xs mb-0.5">
              <Label htmlFor="name" className="sr-only">{t('profile.name')}</Label>
              <Input
                id="name"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value.slice(0, 24) })}
                maxLength={24}
                placeholder={t('profile.namePlaceholder')}
                className="text-center text-lg font-semibold"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-center">
                {editData.name?.length || 0}/24
              </p>
            </div>
          )}

          {/* Profile title – read mode */}
          {gamification.activeProfileTitle && !isEditing && (
            <span className="text-sm font-medium text-accent mb-3">
              {gamification.activeProfileTitle}
            </span>
          )}

          {/* Profile title – edit mode selector */}
          {isEditing && unlockedTitles.length > 0 && (
            <div className="w-full max-w-xs mt-1 mb-1">
              <p className="text-[11px] text-muted-foreground text-center mb-1.5">Profile title</p>
              <div className="relative">
                <select
                  value={selectedTitle ?? ''}
                  onChange={e => setSelectedTitle(e.target.value || null)}
                  disabled={savingTitle}
                  className="w-full appearance-none rounded-xl border border-border bg-muted/40 px-3 py-2 pr-8 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— No title —</option>
                  {unlockedTitles.map(title => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {!isEditing ? (
            <Button variant="secondary" className="w-48 mt-3" onClick={handleEditProfile}>
              {t('profile.editProfile')}
            </Button>
          ) : (
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" className="w-24" onClick={handleCancelEdit}>
                {t('profile.cancel')}
              </Button>
              <Button variant="default" className="w-24" onClick={handleSaveProfile} disabled={isUpdating}>
                {isUpdating ? t('profile.saving') : t('profile.save')}
              </Button>
            </div>
          )}
        </div>

        {/* ── Gamification ───────────────────────────────────────────────── */}

        {/* Level */}
        <LevelCard levelProgress={gamification.levelProgress} />

        {/* Streak + Fitness Score quick view */}
        <div className="grid grid-cols-2 gap-3">
          <StreakCard streak={gamification.currentStreak} />
          {/* Mini score tile */}
          <StatsCard className="flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Fitness Score
            </span>
            {gamification.weeklyFitnessScore ? (
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className="text-4xl font-bold leading-none tabular-nums"
                  style={{
                    color: gamification.weeklyFitnessScore.total >= 85
                      ? 'hsl(var(--accent))'
                      : gamification.weeklyFitnessScore.total >= 70
                        ? '#84cc16'
                        : gamification.weeklyFitnessScore.total >= 50
                          ? '#f59e0b'
                          : '#ef4444'
                  }}
                >
                  {gamification.weeklyFitnessScore.total}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground mt-1">—</span>
            )}
          </StatsCard>
        </div>

        {/* Full fitness score breakdown */}
        {gamification.weeklyFitnessScore && (
          <FitnessScoreCard score={gamification.weeklyFitnessScore} />
        )}

        {/* Badges */}
        <BadgesSection unlockedBadges={gamification.unlockedBadges} />

        {/* ── Settings ───────────────────────────────────────────────────── */}

        {/* Personal info */}
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
                    value={editData.current_weight ?? ""}
                    onChange={(e) => setEditData({ ...editData, current_weight: e.target.value ? Number(e.target.value) : null })}
                    className="w-20 h-8 text-right"
                    placeholder="--"
                  />
                  <span className="text-muted-foreground">{t('profile.kg')}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {profile?.current_weight != null ? `${profile.current_weight} ${t('profile.kg')}` : '--'}
                </span>
              )}
            </div>
          </div>
        </StatsCard>

        {/* Goals */}
        <StatsCard>
          <h3 className="text-lg font-semibold text-foreground mb-4">{t('profile.goalsCard', 'Objetivos')}</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.targetWeight')}</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={editData.target_weight ?? ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, target_weight: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-24 h-8 text-right"
                    placeholder="70"
                  />
                  <span className="text-muted-foreground">{t('profile.kg')}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {profile?.target_weight != null ? `${profile.target_weight} ${t('profile.kg')}` : '--'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.waterGoal', 'Objetivo de agua')}</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editData.water_goal_ml ?? ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, water_goal_ml: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-28 h-8 text-right"
                    placeholder="3000"
                  />
                  <span className="text-muted-foreground">ml</span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {profile?.water_goal_ml != null ? `${profile.water_goal_ml} ml` : '--'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.caloriesGoal', 'Objetivo de calorías')}</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editData.calories_goal ?? ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, calories_goal: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-28 h-8 text-right"
                    placeholder="2000"
                  />
                  <span className="text-muted-foreground">kcal</span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {profile?.calories_goal != null ? `${profile.calories_goal} kcal` : '--'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.burnGoal', 'Objetivo de calorías quemadas')}</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editData.burn_goal_kcal ?? ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, burn_goal_kcal: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-28 h-8 text-right"
                    placeholder="500"
                  />
                  <span className="text-muted-foreground">kcal</span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {profile?.burn_goal_kcal != null ? `${profile.burn_goal_kcal} kcal` : '--'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">{t('profile.stepsGoal', 'Objetivo de pasos')}</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editData.steps_goal ?? ""}
                    onChange={(e) => setEditData(prev => ({ ...prev, steps_goal: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-28 h-8 text-right"
                    placeholder="10000"
                  />
                  <span className="text-muted-foreground">{t('dashboard.steps')}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {profile?.steps_goal != null ? `${profile.steps_goal.toLocaleString('es-ES')} ${t('dashboard.steps')}` : '--'}
                </span>
              )}
            </div>
          </div>
        </StatsCard>

        {/* App preferences */}
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
              <span className="text-muted-foreground">{t(`languages.${normalizeLang(i18n.language)}`)}</span>
            </button>
          </div>
        </StatsCard>

        {/* Account & security */}
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

        {/* Sync & data */}
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
            <div className="flex justify-between items-center gap-4">
              <div>
                <Label htmlFor="share-community" className="text-foreground cursor-pointer">
                  {t('profile.shareWithCommunity')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('profile.shareWithCommunityDescription')}
                </p>
              </div>
              <Switch
                id="share-community"
                checked={shareWithCommunity}
                onCheckedChange={handleShareToggle}
              />
            </div>
            <div className="flex justify-between items-center">
              <Label htmlFor="auto-backup" className="text-foreground cursor-pointer">{t('profile.autoBackup')}</Label>
              <Switch id="auto-backup" checked={autoBackup} onCheckedChange={setAutoBackup} />
            </div>
          </div>
        </StatsCard>

        {/* Help & support */}
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

        {/* Logout */}
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

      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('profile.shareWithCommunity')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('profile.shareWithCommunityDialog')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelShareDialog}>
              {t('profile.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmShare}>
              {t('profile.enable')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Badge unlock celebration modal — shown automatically on first unlock */}
      <BadgeUnlockModal
        badge={currentBadge}
        open={currentBadge !== null}
        onClose={dismissCurrent}
      />
    </div>
  );
};

export default Profile;
