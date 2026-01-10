import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'seller';
}

/**
 * ProtectedRoute - Protege rutas según autenticación y rol
 * 
 * IMPORTANTE: Los roles son SEPARADOS:
 * - 'admin': Solo usuarios con rol admin pueden acceder
 * - 'seller': Solo usuarios con rol seller pueden acceder (admin NO tiene acceso automático)
 * 
 * Un usuario puede tener ambos roles si es necesario.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSeller } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-skyworth-gold" />
      </div>
    );
  }

  if (!user) {
    // Redirigir a login con el contexto correcto
    const redirectPath = location.pathname.replace(/^\//, ''); // Remove leading slash
    const roleContext = requiredRole || '';
    return (
      <Navigate 
        to={`/login?redirect=${redirectPath}&role=${roleContext}`} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Admin routes: SOLO admins
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Seller routes: SOLO sellers (admin NO tiene acceso automático)
  if (requiredRole === 'seller' && !isSeller) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
