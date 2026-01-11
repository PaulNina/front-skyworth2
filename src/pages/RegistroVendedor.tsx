/**
 * Registro Vendedor - Skyworth Mundial 2026
 * 
 * CRITICAL FIX: Compatible con confirmación de email
 * - Si hay sesión inmediata → continuar registro
 * - Si requiere confirmación → guardar form y mostrar mensaje
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Store, Mail, CheckCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const DEPARTMENTS = [
  'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí', 
  'Chuquisaca', 'Tarija', 'Beni', 'Pando'
];

const PENDING_REGISTRATION_KEY = 'skyworth_pending_seller_registration';

interface PendingRegistration {
  fullName: string;
  email: string;
  phone: string;
  storeName: string;
  storeCity: string;
  storeDepartment: string;
}

export default function RegistroVendedor() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeCity: '',
    storeDepartment: '',
    termsAccepted: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [isCompletingRegistration, setIsCompletingRegistration] = useState(false);
  
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  // CRITICAL: Verificar si hay registro pendiente al cargar con usuario confirmado
  useEffect(() => {
    const completePendingRegistration = async () => {
      if (!user) return;
      
      const pendingDataStr = localStorage.getItem(PENDING_REGISTRATION_KEY);
      if (!pendingDataStr) return;
      
      try {
        const pendingData: PendingRegistration = JSON.parse(pendingDataStr);
        setIsCompletingRegistration(true);
        
        // Verificar si ya tiene perfil de vendedor
        const { data: existingSeller } = await supabase
          .from('sellers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (existingSeller) {
          // Ya tiene perfil, limpiar y redirigir
          localStorage.removeItem(PENDING_REGISTRATION_KEY);
          toast({
            title: '¡Ya tienes perfil de vendedor!',
            description: 'Redirigiendo a tu dashboard...',
          });
          navigate('/dashboard-vendedor', { replace: true });
          return;
        }
        
        // Crear profile
        await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            full_name: pendingData.fullName,
            email: pendingData.email,
            phone: pendingData.phone,
            city: pendingData.storeCity,
            department: pendingData.storeDepartment,
          });
        
        // Crear seller
        const { error: sellerError } = await supabase
          .from('sellers')
          .insert({
            user_id: user.id,
            store_name: pendingData.storeName,
            store_city: pendingData.storeCity,
            store_department: pendingData.storeDepartment,
          });
        
        if (sellerError) throw sellerError;
        
        // Asignar rol
        await supabase.rpc('rpc_request_seller_role');
        
        // Limpiar y redirigir
        localStorage.removeItem(PENDING_REGISTRATION_KEY);
        
        toast({
          title: '¡Registro completado!',
          description: 'Tu perfil de vendedor ha sido creado.',
        });
        
        navigate('/dashboard-vendedor', { replace: true });
      } catch (error) {
        console.error('Error completing registration:', error);
        toast({
          title: 'Error al completar registro',
          description: 'Por favor intenta nuevamente.',
          variant: 'destructive',
        });
      } finally {
        setIsCompletingRegistration(false);
      }
    };
    
    completePendingRegistration();
  }, [user, navigate]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.termsAccepted) {
      toast({
        title: 'Error',
        description: 'Debes aceptar los términos y condiciones',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create user account
      const { error: signUpError, needsEmailConfirmation } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        phone: formData.phone,
      });

      if (signUpError) throw signUpError;

      // CRITICAL: Si requiere confirmación de email, guardar datos y mostrar mensaje
      if (needsEmailConfirmation) {
        const pendingData: PendingRegistration = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          storeName: formData.storeName,
          storeCity: formData.storeCity,
          storeDepartment: formData.storeDepartment,
        };
        localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify(pendingData));
        setShowEmailConfirmation(true);
        setIsLoading(false);
        return;
      }

      // Si no requiere confirmación, continuar con registro normal
      const { data: { user: newUser } } = await supabase.auth.getUser();
      
      if (!newUser) {
        throw new Error('No se pudo crear el usuario');
      }

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: newUser.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          city: formData.storeCity,
          department: formData.storeDepartment,
        });

      if (profileError) throw profileError;

      // 3. Create seller record
      const { error: sellerError } = await supabase
        .from('sellers')
        .insert({
          user_id: newUser.id,
          store_name: formData.storeName,
          store_city: formData.storeCity,
          store_department: formData.storeDepartment,
        });

      if (sellerError) throw sellerError;

      // 4. Assign seller role using secure RPC
      const { error: roleError } = await supabase
        .rpc('rpc_request_seller_role');

      if (roleError) throw roleError;

      toast({
        title: '¡Registro exitoso!',
        description: 'Tu cuenta de vendedor ha sido creada.',
      });

      navigate('/dashboard-vendedor', { replace: true });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: 'Error en el registro',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Estado: Completando registro pendiente
  if (isCompletingRegistration) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-skyworth-gold mx-auto mb-4" />
          <p className="text-white">Completando tu registro de vendedor...</p>
        </div>
      </div>
    );
  }

  // Estado: Esperando confirmación de email
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card className="bg-white/10 backdrop-blur-sm border-skyworth-green/30">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-skyworth-green/20 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-skyworth-green" />
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  Confirma tu correo
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Hemos enviado un enlace de confirmación a <strong className="text-white">{formData.email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-skyworth-green/10 border border-skyworth-green/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-skyworth-green mt-0.5" />
                    <div className="text-sm text-gray-300">
                      <p className="font-medium text-white mb-1">Pasos siguientes:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Revisa tu bandeja de entrada</li>
                        <li>Haz clic en el enlace de confirmación</li>
                        <li>Serás redirigido automáticamente</li>
                      </ol>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  ¿No recibiste el correo? Revisa tu carpeta de spam o espera unos minutos.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  Ya confirmé, ir a iniciar sesión
                </Button>
              </CardFooter>
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
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <Card className="bg-white/10 backdrop-blur-sm border-skyworth-gold/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-skyworth-green to-green-400 rounded-full flex items-center justify-center">
                <Store className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Registro de Vendedor
              </CardTitle>
              <CardDescription className="text-gray-300">
                Únete al programa de vendedores Skyworth 2026
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-white">Nombre completo *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Correo electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                {/* Store Info */}
                <div className="space-y-2">
                  <Label htmlFor="storeName" className="text-white">Nombre de la tienda *</Label>
                  <Input
                    id="storeName"
                    value={formData.storeName}
                    onChange={(e) => handleChange('storeName', e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeCity" className="text-white">Ciudad *</Label>
                    <Input
                      id="storeCity"
                      value={formData.storeCity}
                      onChange={(e) => handleChange('storeCity', e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Departamento *</Label>
                    <Select 
                      value={formData.storeDepartment} 
                      onValueChange={(v) => handleChange('storeDepartment', v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">Confirmar contraseña *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 pt-4">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => handleChange('termsAccepted', !!checked)}
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <Label htmlFor="terms" className="text-sm text-gray-300 cursor-pointer">
                    Acepto los términos y condiciones del programa de vendedores Skyworth 2026
                  </Label>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-cta-primary text-lg py-6"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Registrarme como Vendedor
                    </>
                  )}
                </Button>

                <p className="text-sm text-gray-300 text-center">
                  ¿Ya tienes cuenta?{' '}
                  <Link
                    to="/login"
                    className="text-skyworth-gold hover:underline font-medium"
                  >
                    Inicia sesión aquí
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
