import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Database, Key, CheckCircle2 } from "lucide-react";

const SupabaseConfig = () => {
  const navigate = useNavigate();
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if already configured
    const url = localStorage.getItem('EXTERNAL_SUPABASE_URL');
    const key = localStorage.getItem('EXTERNAL_SUPABASE_ANON_KEY');
    
    if (url && key) {
      setIsConfigured(true);
      setSupabaseUrl(url);
      setSupabaseAnonKey('•'.repeat(20) + key.slice(-10));
    }
  }, []);

  const handleSave = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
      toast.error('URL de Supabase inválida');
      return;
    }

    // Save to localStorage
    localStorage.setItem('EXTERNAL_SUPABASE_URL', supabaseUrl);
    localStorage.setItem('EXTERNAL_SUPABASE_ANON_KEY', supabaseAnonKey);
    
    toast.success('Configuración guardada exitosamente');
    setIsConfigured(true);
    
    // Reload to apply new configuration
    setTimeout(() => {
      window.location.href = '/login';
    }, 1000);
  };

  const handleReset = () => {
    localStorage.removeItem('EXTERNAL_SUPABASE_URL');
    localStorage.removeItem('EXTERNAL_SUPABASE_ANON_KEY');
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setIsConfigured(false);
    toast.success('Configuración eliminada');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            Configuración de Supabase
          </CardTitle>
          <CardDescription>
            Configura tu instancia externa de Supabase para usar como backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConfigured && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-500">Configuración activa</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="supabase-url" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Supabase URL
            </Label>
            <Input
              id="supabase-url"
              type="url"
              placeholder="https://xxxxx.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              disabled={isConfigured}
            />
            <p className="text-xs text-muted-foreground">
              La URL de tu proyecto en Supabase
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-key" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Anon Key
            </Label>
            <Input
              id="supabase-key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              disabled={isConfigured}
            />
            <p className="text-xs text-muted-foreground">
              La clave anónima (anon/public key) de tu proyecto
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            {!isConfigured ? (
              <>
                <Button onClick={handleSave} className="flex-1">
                  Guardar configuración
                </Button>
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button variant="destructive" onClick={handleReset} className="flex-1">
                  Eliminar configuración
                </Button>
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Volver
                </Button>
              </>
            )}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
            <h4 className="text-sm font-semibold">Instrucciones:</h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Ve a tu proyecto en Supabase</li>
              <li>Copia la URL del proyecto (Settings → API)</li>
              <li>Copia la clave anónima (anon key)</li>
              <li>Pégalas aquí y guarda</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseConfig;
