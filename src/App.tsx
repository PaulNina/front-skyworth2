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
const Login = lazy(() => import("./pages/Login"));
const Resultados = lazy(() => import("./pages/Resultados"));
const Tombola = lazy(() => import("./pages/Tombola"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const RegistroCliente = lazy(() => import("./pages/RegistroCliente"));
const RegistroExitoso = lazy(() => import("./pages/RegistroExitoso"));
import { VentasRoute } from "@/components/auth/VentasRoute";

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
            
            {/* Registro de Cliente (Página dedicada) */}
            <Route path="/registrar-compra" element={<RegistroCliente />} />
            <Route path="/registro-exitoso" element={<RegistroExitoso />} />
            
            {/* Resultados públicos */}
            <Route path="/resultados" element={<Resultados />} />

            {/* Tómbola del sorteo (solo admin) */}
            <Route 
              path="/tombola" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <Tombola />
                </ProtectedRoute>
              } 
            />

            {/* Login General / Admin */}
            <Route path="/login" element={<Login />} />

            {/* Legacy redirects - compatibilidad */}
            <Route path="/registro-cliente" element={<Navigate to="/registrar-compra" replace />} />
            <Route path="/registro-vendedor" element={<Navigate to="/ventas/registro" replace />} />
            <Route path="/dashboard-vendedor" element={<Navigate to="/ventas/dashboard" replace />} />
            <Route path="/rankings" element={<Navigate to="/ventas/ranking" replace />} />
            <Route path="/vendedores/*" element={<Navigate to="/ventas" replace />} />

            {/* Ventas section (antes Vendedores) */}
            <Route path="/ventas" element={<VendedoresLogin />} />
            <Route path="/ventas/login" element={<Navigate to="/ventas" replace />} />
            <Route path="/ventas/registro" element={<VendedoresRegistro />} />
            <Route 
              path="/ventas/dashboard" 
              element={
                <ProtectedRoute requiredRole="seller">
                  <VendedoresDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/ventas/ranking" element={<VendedoresRanking />} />

            {/* Admin */}
            <Route path="/admin" element={<AdminLogin />} />
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
