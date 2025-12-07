import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Languages } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import appleWhite from "@/assets/apple-white.svg";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) return;
    
    console.log("Attempting login from:", window.location.href);
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      let errorMessage = t("auth.login.errors.default");
      
      if (error.message.includes("Invalid login")) {
        errorMessage = t("auth.login.errors.invalidCredentials");
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = t("auth.login.errors.emailNotConfirmed");
      } else if (error.message.includes("requested path is invalid")) {
        errorMessage = t("auth.login.errors.invalidPath");
      } else if (error.message.includes("invalid_grant")) {
        errorMessage = t("auth.login.errors.invalidGrant");
      } else if (error.message.includes("redirect")) {
        errorMessage = t("auth.login.errors.redirect");
      }
      
      toast({
        title: t("auth.login.toastTitle"),
        description: errorMessage,
        variant: "destructive",
      });
      
      console.error("Login failed:", {
        error: error.message,
        location: window.location.href,
        userAgent: navigator.userAgent,
      });
    }
    
    setIsLoading(false);
  };

  const handleSignUp = () => {
    navigate("/signup");
  };

  const handleGoogleAuth = () => {
    toast({
      title: t("auth.social.comingSoonTitle"),
      description: t("auth.social.comingSoonDescription", { provider: t("auth.social.google") }),
    });
  };

  const handleAppleAuth = () => {
    toast({
      title: t("auth.social.comingSoonTitle"),
      description: t("auth.social.comingSoonDescription", { provider: t("auth.social.apple") }),
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8">
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
          {t("auth.login.title")}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t("auth.login.subtitle")}
        </p>
      </div>

      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
        <Input
          type="email"
          placeholder={t("auth.login.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        <Input
          type="password"
          placeholder={t("auth.login.passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        <Button
          type="submit"
          disabled={isLoading || !email || !password}
          className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-2xl text-base mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t("auth.login.loading") : t("auth.login.button")}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate("/reset-password")}
            className="text-muted-foreground hover:text-foreground text-sm hover:underline"
          >
            {t("auth.login.forgot")}
          </button>
        </div>

        <Button
          type="button"
          onClick={handleSignUp}
          className="w-full h-14 bg-[#1C1F26] hover:bg-[#2A2D35] text-white font-semibold rounded-2xl text-base"
        >
          {t("auth.login.signupCta")}
        </Button>
      </form>

      <div className="w-full max-w-md my-8 text-center">
        <p className="text-muted-foreground text-sm">{t("auth.login.orContinue")}</p>
      </div>

      <div className="w-full max-w-md grid grid-cols-2 gap-4">
        <Button
          type="button"
          onClick={handleGoogleAuth}
          className="h-14 bg-[#1A1A1A] hover:bg-[#252525] text-white rounded-2xl text-base flex items-center justify-center gap-3"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
            <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
            <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
          </svg>
          {t("auth.social.google")}
        </Button>

        <Button
          type="button"
          onClick={handleAppleAuth}
          className="h-14 bg-[#1A1A1A] hover:bg-[#252525] text-white rounded-2xl text-base flex items-center justify-center gap-3"
        >
          <img src={appleWhite} alt="" className="w-6 h-6" aria-hidden />
          <span className="text-white">{t("auth.social.apple")}</span>
        </Button>
      </div>

      <div className="w-full max-w-md mt-8 text-center space-y-4">
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

export default Login;
