import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { NutritionProvider } from "@/contexts/NutritionContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import Comidas from "./pages/Comidas";
import AddFood from "./pages/AddFood";
import CreateRecipe from "./pages/CreateRecipe";
import Gimnasio from "./pages/Gimnasio";
import Comunidad from "./pages/Comunidad";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import SupabaseConfig from "./pages/SupabaseConfig";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Supabase Configuration Guard
const SupabaseGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const configured = isSupabaseConfigured();
    if (!configured && window.location.pathname !== '/supabase-config') {
      navigate('/supabase-config', { replace: true });
    }
    setChecking(false);
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Verificando configuración...</div>
      </div>
    );
  }

  return <>{children}</>;
};

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
      <BrowserRouter>
        <SupabaseGuard>
          <AuthProvider>
            <NutritionProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Routes>
                  {/* Supabase Configuration Route */}
                  <Route path="/supabase-config" element={<SupabaseConfig />} />
                  
                  {/* Protected Routes */}
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/comidas" element={<ProtectedRoute><Comidas /></ProtectedRoute>} />
                  <Route path="/add-food" element={<ProtectedRoute><AddFood /></ProtectedRoute>} />
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
            </NutritionProvider>
          </AuthProvider>
        </SupabaseGuard>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
