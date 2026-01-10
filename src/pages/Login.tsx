import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, Trophy, Shield, Store } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, isAdmin, isSeller } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect from URL params or location state
  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const roleParam = searchParams.get('role');
  
  const isAdminContext = roleParam === 'admin' || redirectParam?.startsWith('admin');
  const isSellerContext = roleParam === 'seller' || redirectParam === 'dashboard-vendedor';
  
  const from = redirectParam 
    ? `/${redirectParam}` 
    : (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Si ya está autenticado, redirigir según rol
  useEffect(() => {
    if (user) {
      if (isAdminContext && isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isSellerContext && isSeller) {
        navigate('/dashboard-vendedor', { replace: true });
      } else if (from !== '/login') {
        navigate(from, { replace: true });
      }
    }
  }, [user, isAdmin, isSeller, isAdminContext, isSellerContext, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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
      description: 'Has iniciado sesión correctamente.',
    });

    // La redirección se maneja en el useEffect
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

  return (
    <div className="min-h-screen bg-skyworth-dark flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
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

                {/* Mostrar enlace de registro solo para vendedores, no para admin */}
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
