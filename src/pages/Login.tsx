/**
 * Login Page - Skyworth Mundial 2026
 * 
 * CRITICAL FIXES:
 * - Espera rolesLoaded=true Y rolesError=null antes de redirigir
 * - Preserva redirect completo (incluyendo subrutas como /admin/products)
 * - Valida redirect para evitar open-redirect attacks
 * - Muestra error técnico si rolesError, con opción de reintentar
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, Trophy, Shield, Store, AlertTriangle, RefreshCw } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// SECURITY: Validar que el redirect sea interno (no open-redirect)
function isValidRedirect(path: string): boolean {
  // Debe empezar con / y no contener //
  if (!path.startsWith('/') || path.includes('//')) return false;
  // No debe contener protocol
  if (path.includes(':')) return false;
  // No debe ir a login para evitar loop
  if (path === '/login' || path.startsWith('/login?')) return false;
  return true;
}

// Obtener fallback según rol
function getFallbackRoute(isAdmin: boolean, isSeller: boolean): string {
  if (isAdmin) return '/admin';
  if (isSeller) return '/dashboard-vendedor';
  return '/';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);
  const [denied, setDenied] = useState<null | 'admin' | 'seller'>(null);
  const [permissionTimeout, setPermissionTimeout] = useState(false);
  
  const { signIn, signOut, user, isAdmin, isSeller, loading, rolesLoaded, rolesError, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Parse redirect params
  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const roleParam = searchParams.get('role');

  // CRITICAL: Decodificar/normalizar redirect completo (acepta con o sin /)
  const decodedRedirect = redirectParam ? decodeURIComponent(redirectParam) : null;
  const normalizedTarget = decodedRedirect
    ? (decodedRedirect.startsWith('/') ? decodedRedirect : `/${decodedRedirect}`)
    : null;
  const safeTarget = normalizedTarget && isValidRedirect(normalizedTarget) ? normalizedTarget : null;

  const normalizedRedirectForContext = decodedRedirect ? decodedRedirect.replace(/^\//, '') : '';
  const isAdminContext = roleParam === 'admin' || normalizedRedirectForContext.startsWith('admin');
  const isSellerContext =
    roleParam === 'seller' ||
    normalizedRedirectForContext === 'dashboard-vendedor' ||
    normalizedRedirectForContext.startsWith('dashboard-vendedor');

  // Redirect logic - SOLO cuando roles están cargados sin error
  useEffect(() => {
    // Esperar hasta que loading termine Y roles estén cargados
    if (loading || !rolesLoaded) return;

    // Si hay error de roles, NO redirigir - mostrar error
    if (rolesError) return;

    if (!user) {
      setDenied(null);
      return;
    }

    // Reset timeout/denied al tener roles OK
    setPermissionTimeout(false);

    // Validar permisos según contexto (SIN loop / SIN redirigir temprano)
    if (isAdminContext && !isAdmin) {
      setDenied('admin');
      setIsLoading(false);
      return;
    }

    if (isSellerContext && !isSeller) {
      setDenied('seller');
      setIsLoading(false);
      return;
    }

    setDenied(null);

    // CRITICAL: Usar redirect exacto si es válido
    if (safeTarget) {
      navigate(safeTarget, { replace: true });
      return;
    }

    // Fallback según rol
    const fallback = getFallbackRoute(isAdmin, isSeller);
    navigate(fallback, { replace: true });
  }, [user, isAdmin, isSeller, loading, rolesLoaded, rolesError, navigate, isAdminContext, isSellerContext, safeTarget]);

  // CRITICAL: evita spinner infinito “Verificando permisos...”
  useEffect(() => {
    const shouldWait = hasAttemptedLogin && !!user && (loading || !rolesLoaded) && !rolesError;
    if (!shouldWait) {
      setPermissionTimeout(false);
      return;
    }

    const t = window.setTimeout(() => setPermissionTimeout(true), 8000);
    return () => window.clearTimeout(t);
  }, [hasAttemptedLogin, user, loading, rolesLoaded, rolesError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasAttemptedLogin(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Error al iniciar sesión',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: '¡Bienvenido!',
      description: 'Verificando permisos...',
    });

    // isLoading se mantiene true hasta que el useEffect redirija
  };

  const getTitle = () => {
    if (isAdminContext) return 'Panel Administrador';
    if (isSellerContext) return 'Portal Vendedor';
    return 'Iniciar Sesión';
  };

  const getDescription = () => {
    if (isAdminContext) return 'Ingresa con credenciales de administrador';
    if (isSellerContext) return 'Ingresa para acceder a tu panel de vendedor';
    return 'Ingresa tus credenciales para acceder';
  };

  const getIcon = () => {
    if (isAdminContext) return <Shield className="h-8 w-8 text-skyworth-dark" />;
    if (isSellerContext) return <Store className="h-8 w-8 text-skyworth-dark" />;
    return <Trophy className="h-8 w-8 text-skyworth-dark" />;
  };

  const getIconBgClass = () => {
    if (isAdminContext) return 'from-amber-500 to-amber-400';
    return 'from-skyworth-gold to-skyworth-gold-light';
  };

  // CRITICAL: Si hay error de roles después de login, mostrar UI de error
  if (hasAttemptedLogin && user && rolesLoaded && rolesError) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card className="bg-white/10 backdrop-blur-sm border-red-500/30">
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
                  onClick={() => {
                    setHasAttemptedLogin(false);
                    setIsLoading(false);
                  }}
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Volver al formulario
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // Estado: Acceso denegado (sin loop)
  if (hasAttemptedLogin && user && rolesLoaded && !rolesError && denied) {
    const isAdminDenied = denied === 'admin';

    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <Card className="bg-white/10 backdrop-blur-sm border-amber-500/30">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                </div>
                <CardTitle className="text-xl text-white">Acceso denegado</CardTitle>
                <CardDescription className="text-gray-300">
                  {isAdminDenied
                    ? 'Tu cuenta no tiene permisos de administrador.'
                    : 'Tu cuenta no tiene rol de vendedor.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {!isAdminDenied && (
                  <Button onClick={() => navigate('/registro-vendedor')} className="w-full btn-cta-primary">
                    Registrarme como Vendedor
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate('/', { replace: true })}
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Ir al inicio
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await signOut();
                    navigate('/login', { replace: true });
                  }}
                  className="w-full text-gray-400 hover:text-white hover:bg-white/10"
                >
                  Cerrar sesión
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  // Estado: carga post-login (roles/auth)
  if (hasAttemptedLogin && user && (!rolesLoaded || loading)) {
    if (permissionTimeout) {
      return (
        <div className="min-h-screen bg-skyworth-dark flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
              <Card className="bg-white/10 backdrop-blur-sm border-red-500/30">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                  </div>
                  <CardTitle className="text-xl text-white">Está tardando más de lo normal</CardTitle>
                  <CardDescription className="text-gray-300">
                    No se pudieron verificar tus permisos a tiempo. Puede ser un problema temporal de conexión o permisos (RLS).
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Button onClick={() => refreshRoles()} className="w-full bg-skyworth-gold hover:bg-skyworth-gold/90 text-black">
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
                    Salir
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </main>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-skyworth-gold mx-auto mb-4" />
            <p className="text-gray-400">Verificando permisos...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-skyworth-dark flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="bg-white/10 backdrop-blur-sm border-skyworth-gold/20">
            <CardHeader className="text-center">
              <div className={`mx-auto mb-4 w-16 h-16 bg-gradient-to-br ${getIconBgClass()} rounded-full flex items-center justify-center`}>
                {getIcon()}
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                {getTitle()}
              </CardTitle>
              <CardDescription className="text-gray-300">
                {getDescription()}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full text-lg py-6 ${isAdminContext ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'btn-cta-primary'}`}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Ingresar
                    </>
                  )}
                </Button>

                {!isAdminContext && (
                  <p className="text-sm text-gray-300 text-center">
                    ¿Eres vendedor y no tienes cuenta?{' '}
                    <Link
                      to="/registro-vendedor"
                      className="text-skyworth-gold hover:underline font-medium"
                    >
                      Regístrate aquí
                    </Link>
                  </p>
                )}

                {isAdminContext && (
                  <p className="text-xs text-gray-400 text-center">
                    El acceso de administrador es solo para usuarios autorizados.
                  </p>
                )}
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
