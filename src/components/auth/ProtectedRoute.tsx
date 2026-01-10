import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'seller';
}

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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === 'seller' && !isSeller && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
