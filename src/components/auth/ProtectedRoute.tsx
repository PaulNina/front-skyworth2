/**
 * ProtectedRoute - Protege rutas según autenticación y rol
 * 
 * CRITICAL FIX: Preserva ruta COMPLETA (pathname + search) en redirect
 * - Admin sin sesión va a /admin/products → redirect=admin/products
 * - Al volver, retorna a /admin/products exactamente
 * 
 * ESTADOS:
 * - loading/!rolesLoaded → Spinner
 * - rolesError → UI de error con reintentar
 * - !user → Redirect a login con ruta completa
 * - sin permisos → Redirect a / con mensaje
 */
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, AlertTriangle, RefreshCw, LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'seller';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, rolesLoaded, rolesError, isAdmin, isSeller, signOut, refreshRoles } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ESTADO 1: Cargando auth o roles → Spinner
  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-skyworth-gold mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // ESTADO 2: Error al cargar roles → UI de error con reintentar
  // CRITICAL: No confundir con "sin permisos" - esto es error técnico
  if (rolesError && user) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center p-4">
        <Card className="bg-white/10 border-red-500/30 max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-xl text-white">Error técnico</CardTitle>
            <CardDescription className="text-gray-300">
              {rolesError}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button 
              onClick={() => refreshRoles()}
              className="w-full bg-skyworth-gold hover:bg-skyworth-gold/90 text-black"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                await signOut();
                navigate('/', { replace: true });
              }}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ESTADO 3: No autenticado → Redirect a login con ruta COMPLETA
  if (!user) {
    // CRITICAL: Incluir pathname completo + search params
    const fullPath = location.pathname + location.search;
    // Quitar el slash inicial para el param, será añadido en Login
    const redirectPath = encodeURIComponent(fullPath.replace(/^\//, ''));
    const roleContext = requiredRole || '';
    
    return (
      <Navigate 
        to={`/login?redirect=${redirectPath}&role=${roleContext}`} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // ESTADO 4: Verificar permisos específicos
  // Admin routes: SOLO admins
  if (requiredRole === 'admin' && !isAdmin) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center p-4">
        <Card className="bg-white/10 border-amber-500/30 max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
            <CardTitle className="text-xl text-white">Acceso denegado</CardTitle>
            <CardDescription className="text-gray-300">
              No tienes permisos de administrador para acceder a esta sección.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate('/', { replace: true })}
              className="w-full bg-skyworth-gold hover:bg-skyworth-gold/90 text-black"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                await signOut();
                navigate('/', { replace: true });
              }}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Seller routes: SOLO sellers
  if (requiredRole === 'seller' && !isSeller) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center p-4">
        <Card className="bg-white/10 border-skyworth-green/30 max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-skyworth-green/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-skyworth-green" />
            </div>
            <CardTitle className="text-xl text-white">No eres vendedor</CardTitle>
            <CardDescription className="text-gray-300">
              Tu cuenta no tiene el rol de vendedor. Si eres vendedor, por favor regístrate.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate('/registro-vendedor')}
              className="w-full btn-cta-primary"
            >
              Registrarme como Vendedor
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/', { replace: true })}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <Home className="h-4 w-4 mr-2" />
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
