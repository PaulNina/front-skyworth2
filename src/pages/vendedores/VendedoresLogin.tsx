/**
 * VendedoresLogin - Login específico para vendedores
 * Ruta: /vendedores/login
 * 
 * Redirige al dashboard vendedor tras login exitoso
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, Store, AlertTriangle, RefreshCw } from 'lucide-react';
import PitchBackground from '@/components/ui/PitchBackground';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function VendedoresLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);
  const [denied, setDenied] = useState(false);
  const [permissionTimeout, setPermissionTimeout] = useState(false);
  
  const { signIn, signOut, user, isSeller, loading, rolesLoaded, rolesError, refreshRoles } = useAuth();
  const navigate = useNavigate();

  // Redirect logic
  useEffect(() => {
    if (loading || !rolesLoaded) return;
    if (rolesError) return;
    if (!user) {
      setDenied(false);
      return;
    }

    setPermissionTimeout(false);

    if (!isSeller) {
      setDenied(true);
      setIsLoading(false);
      return;
    }

    setDenied(false);
    navigate('/vendedores/dashboard', { replace: true });
  }, [user, isSeller, loading, rolesLoaded, rolesError, navigate]);

  // Timeout handling
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
  };

  // Error state
  if (hasAttemptedLogin && user && rolesLoaded && rolesError) {
    return (
      <PitchBackground>
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <Card className="glass-panel border-red-500/30 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <CardTitle className="text-xl text-white font-display">ERROR TÉCNICO</CardTitle>
              <CardDescription className="text-white/60">{rolesError}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={() => refreshRoles()} className="w-full btn-cta-primary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </PitchBackground>
    );
  }

  // Denied state
  if (hasAttemptedLogin && user && rolesLoaded && !rolesError && denied) {
    return (
      <PitchBackground>
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <Card className="glass-panel border-orange-hit/30 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-orange-hit/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-orange-hit" />
              </div>
              <CardTitle className="text-xl text-white font-display">ACCESO DENEGADO</CardTitle>
              <CardDescription className="text-white/60">
                Tu cuenta no tiene rol de vendedor.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={() => navigate('/vendedores/registro')} className="w-full btn-cta-primary">
                Registrarme como Vendedor
              </Button>
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
                  navigate('/vendedores/login', { replace: true });
                }}
                className="w-full text-white/50 hover:text-white hover:bg-white/10"
              >
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </PitchBackground>
    );
  }

  // Loading state
  if (hasAttemptedLogin && user && (!rolesLoaded || loading)) {
    if (permissionTimeout) {
      return (
        <PitchBackground>
          <Header />
          <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
            <Card className="glass-panel border-red-500/30 max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <CardTitle className="text-xl text-white font-display">TARDANDO DEMASIADO</CardTitle>
                <CardDescription className="text-white/60">
                  No se pudieron verificar tus permisos a tiempo.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button onClick={() => refreshRoles()} className="w-full btn-cta-primary">
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
          </main>
          <Footer />
        </PitchBackground>
      );
    }

    return (
      <PitchBackground>
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-green-cta mx-auto mb-4" />
            <p className="text-white/60">Verificando permisos...</p>
          </div>
        </main>
        <Footer />
      </PitchBackground>
    );
  }

  return (
    <PitchBackground>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="glass-panel border-green-cta/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-green-cta to-green-cta/70 rounded-full flex items-center justify-center">
                <Store className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-display text-white">
                PORTAL VENDEDOR
              </CardTitle>
              <CardDescription className="text-white/60">
                Ingresa para acceder a tu panel
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
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
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
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-cta-primary text-lg py-6 font-display"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      INGRESAR
                    </>
                  )}
                </Button>

                <p className="text-sm text-white/60 text-center">
                  ¿No tienes cuenta?{' '}
                  <Link
                    to="/vendedores/registro"
                    className="text-green-cta hover:underline font-medium"
                  >
                    Regístrate aquí
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </PitchBackground>
  );
}
