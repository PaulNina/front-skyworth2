/**
 * RegistrarCompraForm - Formulario embebible de registro de compra
 * 
 * Props:
 * - embedded: boolean - Si es true, no muestra el título grande (para usar dentro de landing)
 * - onSuccess: callback opcional cuando se registra exitosamente
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileCheck, User, CreditCard, MapPin, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DEPARTMENTS = [
  'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro', 'Potosí', 
  'Chuquisaca', 'Tarija', 'Beni', 'Pando'
];

interface FileUpload {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  url: string | null;
}

interface RegistrarCompraFormProps {
  embedded?: boolean;
  onSuccess?: (coupons: string[]) => void;
}

const RegistrarCompraForm = ({ embedded = false, onSuccess }: RegistrarCompraFormProps) => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    ciNumber: '',
    email: '',
    phone: '',
    city: '',
    department: '',
    birthDate: '',
    productId: '',
    serialNumber: '',
    invoiceNumber: '',
    purchaseDate: '',
    termsAccepted: false,
  });

  const [validatingSerial, setValidatingSerial] = useState(false);
  const [serialValidation, setSerialValidation] = useState<{
    valid: boolean;
    message: string;
    productId?: string;
    productName?: string;
    couponsCount?: number;
  } | null>(null);

  const [files, setFiles] = useState<{
    ciFront: FileUpload;
    ciBack: FileUpload;
    invoice: FileUpload;
  }>({
    ciFront: { file: null, preview: null, uploading: false, url: null },
    ciBack: { file: null, preview: null, uploading: false, url: null },
    invoice: { file: null, preview: null, uploading: false, url: null },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [assignedCoupons, setAssignedCoupons] = useState<string[]>([]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'serialNumber') {
      setSerialValidation(null);
    }
  };

  const validateSerial = async (serial: string) => {
    if (!serial || serial.length < 5) {
      setSerialValidation(null);
      return;
    }

    setValidatingSerial(true);
    try {
      const { data, error } = await supabase.rpc('rpc_validate_serial_v2', {
        p_serial: serial.toUpperCase().trim(),
        p_for_type: 'buyer'
      });

      if (error) throw error;

      const result = data as { 
        valid: boolean; 
        error?: string; 
        product_id?: string;
        product_name?: string;
        coupon_count?: number;
      };

      const couponCount = result.coupon_count || 1;
      setSerialValidation({
        valid: result.valid,
        message: result.valid 
          ? `✓ Serial válido - ${couponCount} cupón${couponCount > 1 ? 'es' : ''}`
          : result.error || 'Serial no disponible',
        productId: result.product_id,
        productName: result.product_name,
        couponsCount: couponCount,
      });

      if (result.valid && result.product_id) {
        setFormData(prev => ({ ...prev, productId: result.product_id! }));
      }
    } catch (err) {
      console.error('Serial validation error:', err);
      setSerialValidation({
        valid: false,
        message: 'Error al validar serial. Intenta de nuevo.',
      });
    } finally {
      setValidatingSerial(false);
    }
  };

  const handleFileChange = (field: 'ciFront' | 'ciBack' | 'invoice', file: File | null) => {
    if (file) {
      const preview = URL.createObjectURL(file);
      setFiles(prev => ({
        ...prev,
        [field]: { ...prev[field], file, preview }
      }));
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('purchase-documents')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      toast({
        title: 'Error',
        description: 'Debes aceptar los términos y condiciones',
        variant: 'destructive',
      });
      return;
    }

    if (!serialValidation?.valid || !serialValidation.productId) {
      toast({
        title: 'Error',
        description: 'Debes ingresar un número de serie válido',
        variant: 'destructive',
      });
      return;
    }

    const birthDate = new Date(formData.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      toast({
        title: 'Error',
        description: 'Debes ser mayor de 18 años para participar',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let ciFrontUrl = null;
      let ciBackUrl = null;
      let invoiceUrl = null;

      if (files.ciFront.file) {
        ciFrontUrl = await uploadFile(files.ciFront.file, 'ci-front');
      }
      if (files.ciBack.file) {
        ciBackUrl = await uploadFile(files.ciBack.file, 'ci-back');
      }
      if (files.invoice.file) {
        invoiceUrl = await uploadFile(files.invoice.file, 'invoices');
      }

      const { data: registerData, error: registerError } = await supabase.rpc(
        'rpc_register_buyer_serial',
        {
          p_full_name: formData.fullName,
          p_ci_number: formData.ciNumber,
          p_email: formData.email,
          p_phone: formData.phone,
          p_city: formData.city,
          p_department: formData.department,
          p_birth_date: formData.birthDate,
          p_invoice_number: formData.invoiceNumber,
          p_purchase_date: formData.purchaseDate,
          p_serial_number: formData.serialNumber,
          p_ci_front_url: ciFrontUrl,
          p_ci_back_url: ciBackUrl,
          p_invoice_url: invoiceUrl,
        }
      );

      if (registerError) throw registerError;

      const result = registerData as {
        success?: boolean;
        error?: string;
        purchase_id?: string;
        coupons?: string[];
        coupon_count?: number;
      };

      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo registrar la compra');
      }

      const coupons = result.coupons || [];
      setAssignedCoupons(coupons);

      if (result.purchase_id) {
        try {
          await supabase.functions.invoke('process-client-purchase', {
            body: { purchaseId: result.purchase_id }
          });
        } catch (notifError) {
          console.error('Error sending notifications:', notifError);
        }
      }

      toast({
        title: '¡Registro exitoso!',
        description: coupons.length
          ? `Se generaron ${coupons.length} cupón(es) para el sorteo.`
          : 'Tu compra fue registrada.',
      });

      if (onSuccess) {
        onSuccess(coupons);
      }

      setShowSuccess(true);

    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: 'Error al registrar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-3xl p-6 md:p-8 shadow-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white mb-4">
              <User className="w-5 h-5 text-green-cta" />
              <h3 className="font-semibold font-display text-lg">DATOS PERSONALES</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName" className="text-white">Nombre Completo *</Label>
                <Input 
                  id="fullName" 
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Tu nombre completo" 
                  required
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                />
              </div>
              <div>
                <Label htmlFor="ciNumber" className="text-white">Número de CI *</Label>
                <Input 
                  id="ciNumber" 
                  value={formData.ciNumber}
                  onChange={(e) => handleChange('ciNumber', e.target.value)}
                  placeholder="12345678" 
                  required
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-white">Email *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="tu@email.com" 
                  required
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-white">WhatsApp *</Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+591 70000000" 
                  required
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                />
              </div>
              <div>
                <Label htmlFor="birthDate" className="text-white">Fecha de Nacimiento *</Label>
                <Input 
                  id="birthDate" 
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange('birthDate', e.target.value)}
                  required
                  className="mt-1 bg-white/10 border-white/20 text-white" 
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-white mb-4">
              <MapPin className="w-5 h-5 text-green-cta" />
              <h3 className="font-semibold font-display text-lg">UBICACIÓN</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city" className="text-white">Ciudad *</Label>
                <Input 
                  id="city" 
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Tu ciudad" 
                  required
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                />
              </div>
              <div>
                <Label className="text-white">Departamento *</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(v) => handleChange('department', v)}
                >
                  <SelectTrigger className="mt-1 bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-pitch-800 border-white/20">
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept} className="text-white hover:bg-white/10">{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Purchase Info */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-white mb-4">
              <CreditCard className="w-5 h-5 text-green-cta" />
              <h3 className="font-semibold font-display text-lg">DATOS DE COMPRA</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="serialNumber" className="text-white">Número de Serie *</Label>
                <Input 
                  id="serialNumber" 
                  value={formData.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value.toUpperCase())}
                  onBlur={() => validateSerial(formData.serialNumber)}
                  placeholder="Ingresa el número de serie del TV" 
                  required
                  className={`mt-1 bg-white/10 border-white/20 text-white font-mono placeholder:text-white/50 ${validatingSerial ? 'opacity-70' : ''}`}
                />
                {validatingSerial && (
                  <p className="text-sm text-white/60 mt-1 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Validando serial...
                  </p>
                )}
                {serialValidation && (
                  <div className={`mt-2 p-3 rounded-lg ${serialValidation.valid ? 'bg-green-cta/20 border border-green-cta/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                    {serialValidation.valid ? (
                      <div className="space-y-1">
                        <p className="text-green-cta font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Serial válido
                        </p>
                        <p className="text-sm text-white">
                          <span className="font-semibold">Modelo:</span> {serialValidation.productName}
                        </p>
                        <p className="text-sm text-orange-hit">
                          🎫 Recibirás {serialValidation.couponsCount} cupón{(serialValidation.couponsCount || 1) > 1 ? 'es' : ''} para el sorteo
                        </p>
                      </div>
                    ) : (
                      <p className="text-red-400">{serialValidation.message}</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="invoiceNumber" className="text-white">Número de Factura *</Label>
                <Input 
                  id="invoiceNumber" 
                  value={formData.invoiceNumber}
                  onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                  placeholder="Número de factura" 
                  required
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-white/50" 
                />
              </div>
              <div>
                <Label htmlFor="purchaseDate" className="text-white">Fecha de Compra *</Label>
                <Input 
                  id="purchaseDate" 
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => handleChange('purchaseDate', e.target.value)}
                  required
                  className="mt-1 bg-white/10 border-white/20 text-white" 
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-white mb-4">
              <FileCheck className="w-5 h-5 text-green-cta" />
              <h3 className="font-semibold font-display text-lg">DOCUMENTOS</h3>
            </div>
            <div className="grid gap-4">
              {[
                { key: 'ciFront' as const, label: 'CI Anverso (frente)' },
                { key: 'ciBack' as const, label: 'CI Reverso (atrás)' },
                { key: 'invoice' as const, label: 'Factura de Compra' },
              ].map(({ key, label }) => (
                <label 
                  key={key} 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    files[key].preview 
                      ? 'border-green-cta bg-green-cta/10' 
                      : 'border-white/30 hover:border-green-cta/50'
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
                  />
                  {files[key].preview ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-cta" />
                      <span className="text-sm text-white font-medium">
                        {files[key].file?.name}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-white/60" />
                      <p className="text-sm text-white font-medium">{label}</p>
                      <p className="text-xs text-white/50">Click para subir</p>
                    </>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* T&C */}
          <div className="flex items-start gap-3 pt-4">
            <Checkbox 
              id="terms" 
              checked={formData.termsAccepted}
              onCheckedChange={(checked) => handleChange('termsAccepted', !!checked)}
              className="mt-1 border-white/30"
            />
            <Label htmlFor="terms" className="text-sm text-white/80 leading-relaxed cursor-pointer">
              Acepto los Términos y Condiciones de la promoción "El Sueño del Hincha – Skyworth" y autorizo el uso de mis datos personales.
            </Label>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full btn-cta-primary text-lg py-6 font-display"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>⚽ REGISTRAR MI COMPRA</>
            )}
          </Button>
        </form>
      </motion.div>

      {/* Success Modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-pitch-800 border-green-cta/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-white flex flex-col items-center gap-4 font-display">
              <div className="w-16 h-16 bg-green-cta rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              ¡GOOOL! 🎉
            </DialogTitle>
            <DialogDescription className="text-center text-white/70 space-y-4">
              <p className="text-lg">
                Tu compra ha sido registrada exitosamente.
              </p>
              <p>
                Nuestro equipo validará tus documentos y te notificaremos por WhatsApp y Email cuando tus cupones sean asignados.
              </p>
              {assignedCoupons.length > 0 && (
                <div className="bg-orange-hit/20 rounded-lg p-4 mt-4">
                  <p className="font-bold text-orange-hit mb-2">Tus cupones:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {assignedCoupons.map(coupon => (
                      <span key={coupon} className="bg-orange-hit text-pitch-900 px-3 py-1 rounded-full font-mono font-bold">
                        {coupon}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <Button 
            onClick={() => {
              setShowSuccess(false);
              if (!embedded) {
                navigate('/');
              }
            }}
            className="w-full btn-cta-primary mt-4 font-display"
          >
            {embedded ? 'CERRAR' : 'VOLVER AL INICIO'}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RegistrarCompraForm;
