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
 * 
 * CRITICAL: Waits for both loading AND rolesLoaded to be complete before
 * making any navigation decisions to prevent race conditions.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, rolesLoaded, isAdmin, isSeller } = useAuth();
  const location = useLocation();

  // Show loading while auth state OR roles are being loaded
  if (loading || !rolesLoaded) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-skyworth-gold" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    const redirectPath = location.pathname.replace(/^\//, '');
    const roleContext = requiredRole || '';
    return (
      <Navigate 
        to={`/login?redirect=${redirectPath}&role=${roleContext}`} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Admin routes: ONLY admins (not sellers without admin role)
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Seller routes: ONLY sellers (admin does NOT have automatic access)
  if (requiredRole === 'seller' && !isSeller) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}