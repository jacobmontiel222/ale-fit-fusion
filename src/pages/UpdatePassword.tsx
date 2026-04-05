import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const UpdatePassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Verify there is an active recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
        navigate("/login", { replace: true });
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }

    if (password !== confirm) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contraseña actualizada", description: "Ya puedes iniciar sesión con tu nueva contraseña." });
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    }

    setIsLoading(false);
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Verificando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-md mb-8 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-3">Nueva contraseña</h1>
        <p className="text-muted-foreground text-lg">Elige una contraseña segura para tu cuenta.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <Input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
          minLength={8}
        />
        <Input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-14 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-2xl text-base"
          required
          minLength={8}
        />
        <Button
          type="submit"
          disabled={isLoading || !password || !confirm}
          className="w-full h-14 bg-[#007AFF] hover:bg-[#0066DD] text-white font-semibold rounded-2xl text-base mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Guardando..." : "Actualizar contraseña"}
        </Button>
      </form>
    </div>
  );
};

export default UpdatePassword;
