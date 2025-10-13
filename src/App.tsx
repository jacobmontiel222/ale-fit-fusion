import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NutritionProvider } from "@/contexts/NutritionContext";
import Index from "./pages/Index";
import Comidas from "./pages/Comidas";
import AddFood from "./pages/AddFood";
import CreateRecipe from "./pages/CreateRecipe";
import Gimnasio from "./pages/Gimnasio";
import Comunidad from "./pages/Comunidad";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NutritionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/comidas" element={<Comidas />} />
              <Route path="/add-food" element={<AddFood />} />
              <Route path="/create-recipe" element={<CreateRecipe />} />
              <Route path="/gimnasio" element={<Gimnasio />} />
              <Route path="/comunidad" element={<Comunidad />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/profile" element={<Profile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NutritionProvider>
    </QueryClientProvider>
  );
};

export default App;
