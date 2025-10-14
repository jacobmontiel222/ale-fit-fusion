import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasMinLength || !hasUpperCase || !hasNumber) {
      toast({
        title: "Contraseña inválida",
        description: "La contraseña debe cumplir todos los requisitos.",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        description: "Verifica que ambas contraseñas sean iguales.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    const { error } = await signUp(email, password, name);
    
    if (error) {
      toast({
        title: "Error al crear cuenta",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Cuenta creada!",
        description: "Tu cuenta ha sido creada exitosamente.",
      });
      // User will be automatically redirected by AuthContext
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8">
      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <button 
          onClick={() => navigate("/login")}
          className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Header */}
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-3">
          Create Account
        </h1>
        <p className="text-muted-foreground text-lg">
          Start your fitness journey today.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignUp} className="w-full max-w-md space-y-4">
        {/* Name Input */}
        <Input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {/* Email Input */}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {/* Password Input */}
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {/* Confirm Password Input */}
        <Input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
        />

        {/* Password Validation Checklist */}
        {password.length > 0 && (
          <div className="p-3 bg-secondary rounded-xl space-y-2">
            <p className="text-xs text-muted-foreground mb-2">La contraseña debe contener:</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-green-500' : 'bg-muted'}`}>
                  {hasMinLength && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={hasMinLength ? 'text-foreground' : 'text-muted-foreground'}>
                  Mínimo 8 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasUpperCase ? 'bg-green-500' : 'bg-muted'}`}>
                  {hasUpperCase && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={hasUpperCase ? 'text-foreground' : 'text-muted-foreground'}>
                  Una letra mayúscula
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${hasNumber ? 'bg-green-500' : 'bg-muted'}`}>
                  {hasNumber && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className={hasNumber ? 'text-foreground' : 'text-muted-foreground'}>
                  Un número
                </span>
              </div>
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordsMatch ? 'bg-green-500' : 'bg-muted'}`}>
                    {passwordsMatch && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={passwordsMatch ? 'text-foreground' : 'text-muted-foreground'}>
                    Las contraseñas coinciden
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sign Up Button */}
        <Button
          type="submit"
          disabled={isLoading || !name || !email || !password || !confirmPassword || !hasMinLength || !hasUpperCase || !hasNumber || !passwordsMatch}
          className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-2xl text-base mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creando cuenta..." : "Sign Up"}
        </Button>

        {/* Already have account */}
        <div className="text-center mt-4">
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[#007AFF] hover:underline font-medium"
            >
              Log In
            </button>
          </p>
        </div>
      </form>

      {/* Footer */}
      <div className="w-full max-w-md mt-8 text-center">
        <p className="text-muted-foreground text-xs leading-relaxed">
          By continuing, you agree to our{" "}
          <button 
            onClick={() => window.open("/terms", "_blank")}
            className="text-foreground hover:underline"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button 
            onClick={() => window.open("/privacy", "_blank")}
            className="text-foreground hover:underline"
          >
            Privacy Policy
          </button>
          .
        </p>
      </div>
    </div>
  );
};

export default SignUp;
