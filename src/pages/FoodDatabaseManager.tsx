import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Download, Database, Trash2, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { foodDatabase } from '@/lib/foodDatabase';
import { importFromJSON, importFromCSV, exportToJSON, readFileAsText } from '@/lib/importFoods';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const FoodDatabaseManager = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [foodCount, setFoodCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    loadCount();
  }, []);

  const loadCount = async () => {
    try {
      const count = await foodDatabase.getCount();
      setFoodCount(count);
    } catch (error) {
      console.error('Error cargando conteo:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    
    try {
      const content = await readFileAsText(file);
      let result;

      if (file.name.endsWith('.json')) {
        const foods = JSON.parse(content);
        result = await importFromJSON(Array.isArray(foods) ? foods : [foods]);
        toast.success(`Importados ${result.success} alimentos desde JSON`);
      } else if (file.name.endsWith('.csv')) {
        result = await importFromCSV(content);
        toast.success(`Importados ${result.success} alimentos desde CSV`);
      } else {
        toast.error('Formato no soportado. Usa JSON o CSV');
        return;
      }

      if (result.errors > 0) {
        toast.warning(`${result.errors} alimentos con errores`);
      }

      await loadCount();
    } catch (error) {
      console.error('Error importando:', error);
      toast.error('Error al importar el archivo');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `food-database-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Base de datos exportada');
    } catch (error) {
      console.error('Error exportando:', error);
      toast.error('Error al exportar la base de datos');
    }
  };

  const handleClear = async () => {
    try {
      setLoading(true);
      await foodDatabase.clearAll();
      await loadCount();
      setShowClearDialog(false);
      toast.success('Base de datos limpiada');
    } catch (error) {
      console.error('Error limpiando base de datos:', error);
      toast.error('Error al limpiar la base de datos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Base de datos de alimentos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tu colección de alimentos offline
            </p>
          </div>
        </div>

        {/* Estado actual */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Alimentos almacenados</p>
              <p className="text-3xl font-bold text-foreground">{foodCount}</p>
            </div>
          </div>
        </Card>

        {/* Instrucciones */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">¿Cómo importar alimentos?</h3>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-1">1. Formato JSON</p>
              <p>El archivo debe contener un array de objetos con esta estructura:</p>
              <pre className="bg-muted p-2 rounded mt-2 text-xs overflow-x-auto">
{`{
  "id": "uuid",
  "name": "Manzana",
  "category": "frutas",
  "tags": ["bajo-calorias"],
  "calories": 52,
  "protein": 0.3,
  "fat": 0.2,
  "carbs": 14,
  "servingSize": 100,
  "servingUnit": "g",
  "micronutrients": {
    "vitamins": [],
    "minerals": []
  }
}`}
              </pre>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-1">2. Formato CSV</p>
              <p>El archivo CSV debe tener estas columnas:</p>
              <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                name, brand, category, calories, protein, fat, carbs, servingSize, servingUnit
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-1">3. Categorías disponibles</p>
              <p>
                frutas, verduras, carnes, pescados, lacteos, legumbres, cereales, 
                frutos-secos, bebidas, aceites, huevos, otros
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-1">4. Etiquetas disponibles</p>
              <p>
                alto-proteina, bajo-grasa, alto-fibra, bajo-calorias, vegano, 
                vegetariano, sin-gluten, sin-lactosa, organico, procesado
              </p>
            </div>
          </div>
        </Card>

        {/* Acciones */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full gap-2"
            size="lg"
            disabled={loading}
          >
            <Upload className="w-5 h-5" />
            {loading ? 'Importando...' : 'Importar desde JSON/CSV'}
          </Button>

          {foodCount > 0 && (
            <>
              <Button
                onClick={handleExport}
                variant="outline"
                className="w-full gap-2"
                size="lg"
              >
                <Download className="w-5 h-5" />
                Exportar base de datos
              </Button>

              <Button
                onClick={() => setShowClearDialog(true)}
                variant="destructive"
                className="w-full gap-2"
                size="lg"
              >
                <Trash2 className="w-5 h-5" />
                Limpiar base de datos
              </Button>
            </>
          )}
        </div>

        {/* Información adicional */}
        <Card className="p-4 bg-secondary/30">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileJson className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Base de datos offline</p>
              <p className="text-muted-foreground">
                Todos los alimentos se almacenan localmente en tu dispositivo usando IndexedDB. 
                Puedes buscar y añadir alimentos sin conexión a internet.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Diálogo de confirmación para limpiar */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Limpiar base de datos?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará todos los {foodCount} alimentos de la base de datos local. 
              No podrás deshacer esta acción. Te recomendamos exportar una copia de seguridad antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground">
              Sí, limpiar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FoodDatabaseManager;
