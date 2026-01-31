/**
 * Registro Vendedor - Skyworth Mundial 2026
 * 
 * Migrated from Supabase to custom backend API
 * Vendors can self-register through the backend
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL, API_ENDPOINTS, ApiResponse } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Store, CheckCircle, AlertTriangle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { validateBolivianPhone } from '@/lib/phoneValidation';

const DEPARTMENTS = [
  'La Paz', 'Cochabamba', 'Santa Cruz'
];

interface RegistroVendedorResult {
  vendedorId?: number;
  mensaje?: string;
}

export default function RegistroVendedor() {
  const [formData, setFormData] = useState({
    fullName: '',
    ci: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    storeName: '',
    storeCity: '',
    storeDepartment: '',
    birthDate: '',
    termsAccepted: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field: string, value: string | boolean) => {
    // Validar número de teléfono (Bolivia: 8 dígitos, empieza con 6 o 7)
    if (field === 'phone' && typeof value === 'string') {
      // Solo permitir números
      const cleaned = value.replace(/\D/g, '');
      
      // Limitar a 8 dígitos
      if (cleaned.length > 8) {
        return;
      }
      
      // Actualizar con el valor limpio
      setFormData(prev => ({ ...prev, [field]: cleaned }));
      
      // Validar si tiene contenido
      if (cleaned.length > 0) {
        const validation = validateBolivianPhone(cleaned);
        if (!validation.isValid && cleaned.length === 8) {
          setPhoneError(validation.error || null);
        } else if (cleaned.length < 8) {
          setPhoneError('Debe tener 8 dígitos');
        } else {
          setPhoneError(null);
        }
      } else {
        setPhoneError(null);
      }
      return;
    }
    
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

    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    // Validar teléfono
    const phoneValidation = validateBolivianPhone(formData.phone);
    if (!phoneValidation.isValid) {
      toast({
        title: 'Error',
        description: phoneValidation.error || 'El número de teléfono debe ser un celular boliviano de 8 dígitos que empiece con 6 o 7.',
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
      // Register vendor through backend API
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VENDEDOR.REGISTRAR}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.fullName,
          ci: formData.ci,
          email: formData.email,
          telefono: formData.phone,
          password: formData.password,
          tienda: formData.storeName,
          ciudad: formData.storeCity,
          departamento: formData.storeDepartment,
          fechaNacimiento: formData.birthDate,
        }),
      });

      const result: ApiResponse<RegistroVendedorResult> = await response.json();

      if (result.error || !response.ok) {
        throw new Error(result.mensaje || 'Error al registrar vendedor');
      }

      // Show success and auto-login
      setShowSuccess(true);
      
      toast({
        title: '¡Registro exitoso!',
        description: 'Tu cuenta de vendedor ha sido creada.',
      });

      // Auto-login after successful registration
      setTimeout(async () => {
        const { error: loginError } = await signIn(formData.email, formData.password);
        if (!loginError) {
          navigate('/ventas/dashboard', { replace: true });
        } else {
          navigate('/ventas', { replace: true });
        }
      }, 2000);

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

  // Estado: Registro exitoso
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-skyworth-dark flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="bg-white/10 backdrop-blur-sm border-skyworth-green/30">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-skyworth-green/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-skyworth-green" />
                </div>
                <CardTitle className="text-2xl font-bold text-white">
                  ¡Registro Exitoso!
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Tu cuenta de vendedor ha sido creada correctamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-400">
                  Redirigiendo a tu dashboard...
                </p>
                <Loader2 className="h-6 w-6 animate-spin text-skyworth-gold mx-auto mt-4" />
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
                    <Label htmlFor="ci" className="text-white">CI *</Label>
                    <Input
                      id="ci"
                      value={formData.ci}
                      onChange={(e) => handleChange('ci', e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">Teléfono *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="7XXXXXXX (8 dígitos)"
                      required
                      maxLength={8}
                      disabled={isLoading}
                      className={`bg-white/10 border-white/20 text-white ${phoneError ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {phoneError && (
                      <p className="text-sm text-red-400 mt-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {phoneError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="birthDate" className="text-white">Fecha de Nacimiento *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      min="1900-01-01"
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.birthDate}
                      onChange={(e) => handleChange('birthDate', e.target.value)}
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
                    to="/ventas"
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
