import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load pages
const Resultados = lazy(() => import("./pages/Resultados"));
const Admin = lazy(() => import("./pages/Admin"));

// Vendedores section
const VendedoresIndex = lazy(() => import("./pages/vendedores/VendedoresIndex"));
const VendedoresLogin = lazy(() => import("./pages/vendedores/VendedoresLogin"));
const VendedoresRegistro = lazy(() => import("./pages/vendedores/VendedoresRegistro"));
const VendedoresDashboard = lazy(() => import("./pages/vendedores/VendedoresDashboard"));
const VendedoresRanking = lazy(() => import("./pages/vendedores/VendedoresRanking"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen bg-pitch-900 flex items-center justify-center">
    <div className="text-white">Cargando...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Landing cliente (one-page con formulario embebido) */}
            <Route path="/" element={<Index />} />
            
            {/* Resultados públicos */}
            <Route path="/resultados" element={<Resultados />} />

            {/* Legacy redirects - compatibilidad */}
            <Route path="/registro-cliente" element={<Navigate to="/#registrar-compra" replace />} />
            <Route path="/login" element={<Navigate to="/vendedores/login" replace />} />
            <Route path="/registro-vendedor" element={<Navigate to="/vendedores/registro" replace />} />
            <Route path="/dashboard-vendedor" element={<Navigate to="/vendedores/dashboard" replace />} />
            <Route path="/rankings" element={<Navigate to="/vendedores/ranking" replace />} />

            {/* Vendedores section */}
            <Route path="/vendedores" element={<VendedoresIndex />} />
            <Route path="/vendedores/login" element={<VendedoresLogin />} />
            <Route path="/vendedores/registro" element={<VendedoresRegistro />} />
            <Route 
              path="/vendedores/dashboard" 
              element={
                <ProtectedRoute requiredRole="seller">
                  <VendedoresDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/vendedores/ranking" element={<VendedoresRanking />} />

            {/* Admin */}
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
