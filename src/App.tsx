import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NutritionProvider } from "@/contexts/NutritionContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import SplashScreenHandler from "@/components/SplashScreenHandler";
import AnimatedSplash from "./pages/AnimatedSplash";
import Index from "./pages/Index";
import Comidas from "./pages/Comidas";
import AddFood from "./pages/AddFood";
import CreateRecipe from "./pages/CreateRecipe";
import Recipes from "./pages/Recipes";
import Gimnasio from "./pages/Gimnasio";
import Comunidad from "./pages/Comunidad";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Public Route Component (redirect to home if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <BrowserRouter>
          <AuthProvider>
            <NutritionProvider>
              <SplashScreenHandler>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                  {/* Splash Screen */}
                  <Route path="/splash" element={<AnimatedSplash />} />
                  
                  {/* Protected Routes */}
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/comidas" element={<ProtectedRoute><Comidas /></ProtectedRoute>} />
                  <Route path="/add-food" element={<ProtectedRoute><AddFood /></ProtectedRoute>} />
                  <Route path="/recipes" element={<ProtectedRoute><Recipes /></ProtectedRoute>} />
                  <Route path="/create-recipe" element={<ProtectedRoute><CreateRecipe /></ProtectedRoute>} />
                  <Route path="/gimnasio" element={<ProtectedRoute><Gimnasio /></ProtectedRoute>} />
                  <Route path="/comunidad" element={<ProtectedRoute><Comunidad /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  
                  {/* Public Routes (redirect to home if logged in) */}
                  <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                  <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
                  <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
                  <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </SplashScreenHandler>
          </NutritionProvider>
        </AuthProvider>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
