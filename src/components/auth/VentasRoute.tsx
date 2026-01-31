import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import VendedoresDashboard from "@/pages/vendedores/VendedoresDashboard";
import VendedoresLogin from "@/pages/vendedores/VendedoresLogin";
import { Loader2 } from "lucide-react";

/**
 * VentasRoute
 * 
 * Maneja la lógica de acceso a /ventas:
 * - Si está logueado como vendedor -> Muestra Dashboard
 * - Si no está logueado -> Muestra Login de Vendedor
 * - Si es admin/otro -> Redirige a inicio (por seguridad/limpieza)
 */
export const VentasRoute = () => {
    const { user, isSeller, loading, rolesLoaded } = useAuth();
  
    // 1. Cargando
    if (loading || !rolesLoaded) {
      return (
        <div className="min-h-screen bg-pitch-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-cta" />
        </div>
      );
    }
  
    // 2. Si es vendedor autenticado -> Dashboard direcamtente
    if (user && isSeller) {
      return <VendedoresDashboard />;
    }
    
    // 3. Si es usuario pero NO vendedor (ej. admin) -> Redirect a inicio o dashboard correspondiente
    if (user && !isSeller) {
        return <Navigate to="/" replace />;
    }

    // 4. Si no hay usuario -> Redirect a Login de Vendedor (o mostrarlo directo)
    // El usuario pidió: "si no esta logueado que lo rediriga que muestre el login"
    // Usamos Navigate para redirigir a la URL canónica de login
    return <Navigate to="/vendedores/login" replace />;
};
