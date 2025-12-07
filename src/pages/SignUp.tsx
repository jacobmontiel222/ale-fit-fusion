import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Languages } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasMinLength || !hasUpperCase || !hasNumber) {
      toast({
        title: t("auth.signup.toasts.invalidPasswordTitle"),
        description: t("auth.signup.toasts.invalidPasswordDesc"),
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: t("auth.signup.toasts.mismatchTitle"),
        description: t("auth.signup.toasts.mismatchDesc"),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    const { error } = await signUp(email, password, name);
    
    if (error) {
      toast({
        title: t("auth.signup.toasts.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("auth.signup.toasts.successTitle"),
        description: t("auth.signup.toasts.successDesc"),
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8">
      <div className="absolute top-6 left-6">
        <button 
          onClick={() => navigate("/login")}
          className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          aria-label={t("auth.signup.loginCta")}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setShowLanguageSelector(true)}
          className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          aria-label={t("auth.languageButton")}
        >
          <Languages className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-3">
          {t("auth.signup.title")}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t("auth.signup.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSignUp} className="w-full max-w-md space-y-4">
        <Input
          type="text"
          placeholder={t("auth.signup.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        <Input
          type="email"
          placeholder={t("auth.signup.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        <Input
          type="password"
          placeholder={t("auth.signup.passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        <Input
          type="password"
          placeholder={t("auth.signup.confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {password.length > 0 && (
          <div className="p-3 bg-secondary rounded-xl space-y-2">
            <p className="text-xs text-muted-foreground mb-2">{t("auth.signup.passwordRequirementsTitle")}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasMinLength ? "bg-green-500" : "bg-muted"}`}>
                  {hasMinLength && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={hasMinLength ? "text-foreground" : "text-muted-foreground"}>
                  {t("auth.signup.reqMinLength")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasUpperCase ? "bg-green-500" : "bg-muted"}`}>
                  {hasUpperCase && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={hasUpperCase ? "text-foreground" : "text-muted-foreground"}>
                  {t("auth.signup.reqUppercase")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasNumber ? "bg-green-500" : "bg-muted"}`}>
                  {hasNumber && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={hasNumber ? "text-foreground" : "text-muted-foreground"}>
                  {t("auth.signup.reqNumber")}
                </span>
              </div>
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordsMatch ? "bg-green-500" : "bg-muted"}`}>
                    {passwordsMatch && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={passwordsMatch ? "text-foreground" : "text-muted-foreground"}>
                    {t("auth.signup.reqMatch")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !name || !email || !password || !confirmPassword || !hasMinLength || !hasUpperCase || !hasNumber || !passwordsMatch}
          className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-2xl text-base mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t("auth.signup.loading") : t("auth.signup.button")}
        </Button>

        <div className="text-center mt-4">
          <p className="text-muted-foreground text-sm">
            {t("auth.signup.haveAccount")}{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[#007AFF] hover:underline font-medium"
            >
              {t("auth.signup.loginCta")}
            </button>
          </p>
        </div>
      </form>

      <div className="w-full max-w-md mt-8 text-center">
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t("auth.terms.agree")}{" "}
          <button 
            onClick={() => window.open("/terms", "_blank")}
            className="text-foreground hover:underline"
          >
            {t("auth.terms.termsOfService")}
          </button>{" "}
          {t("auth.terms.and")}{" "}
          <button 
            onClick={() => window.open("/privacy", "_blank")}
            className="text-foreground hover:underline"
          >
            {t("auth.terms.privacyPolicy")}
          </button>
          .
        </p>
      </div>

      <LanguageSelector
        open={showLanguageSelector}
        onOpenChange={setShowLanguageSelector}
      />
    </div>
  );
};

export default SignUp;
