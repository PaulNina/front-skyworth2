import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import RegistroCliente from "./pages/RegistroCliente";
import NotFound from "./pages/NotFound";

// Lazy load protected pages
const Login = lazy(() => import("./pages/Login"));
const RegistroVendedor = lazy(() => import("./pages/RegistroVendedor"));
const Rankings = lazy(() => import("./pages/Rankings"));
const DashboardVendedor = lazy(() => import("./pages/DashboardVendedor"));
const Admin = lazy(() => import("./pages/Admin"));
const Resultados = lazy(() => import("./pages/Resultados"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-foreground">Cargando...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/registro-cliente" element={<RegistroCliente />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro-vendedor" element={<RegistroVendedor />} />
              <Route path="/rankings" element={<Rankings />} />
              <Route path="/resultados" element={<Resultados />} />
              
              {/* Protected seller routes */}
              <Route
                path="/dashboard-vendedor"
                element={
                  <ProtectedRoute requiredRole="seller">
                    <DashboardVendedor />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected admin routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Admin />
                  </ProtectedRoute>
                }
              />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
