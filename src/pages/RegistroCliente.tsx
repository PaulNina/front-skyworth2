import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatBot from "@/components/chat/ChatBot";
import { motion } from "framer-motion";
import { Upload, FileCheck, User, CreditCard, Calendar, MapPin, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";

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

const RegistroCliente = () => {
  const navigate = useNavigate();
  const { data: products, isLoading: loadingProducts } = useProducts();
  
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
    // Reset serial validation when serial changes
    if (field === 'serialNumber') {
      setSerialValidation(null);
    }
  };

  // Validate serial number via RPC
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
        reason?: string; 
        product_id?: string;
        product_name?: string;
        coupons_count?: number;
      };

      setSerialValidation({
        valid: result.valid,
        message: result.valid 
          ? `✓ Serial válido: ${result.product_name} (${result.coupons_count} cupones)`
          : result.reason || 'Serial no disponible',
        productId: result.product_id,
        productName: result.product_name,
        couponsCount: result.coupons_count,
      });

      // Auto-select product if valid
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

    if (!formData.productId) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un modelo de TV',
        variant: 'destructive',
      });
      return;
    }

    // Validate age (18+)
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
      // Upload files
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

      // Create purchase record
      const { data: purchase, error: purchaseError } = await supabase
        .from('client_purchases')
        .insert({
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          ci_number: formData.ciNumber,
          city: formData.city,
          department: formData.department,
          birth_date: formData.birthDate,
          product_id: formData.productId,
          serial_number: formData.serialNumber,
          invoice_number: formData.invoiceNumber,
          purchase_date: formData.purchaseDate,
          ci_front_url: ciFrontUrl,
          ci_back_url: ciBackUrl,
          invoice_url: invoiceUrl,
          terms_accepted: formData.termsAccepted,
        })
        .select()
        .single();

      if (purchaseError) {
        if (purchaseError.code === '23505') {
          throw new Error('Esta combinación de número de serie y factura ya fue registrada');
        }
        throw purchaseError;
      }

      // Call AI validation Edge Function
      try {
        const { data: validationResult, error: validationError } = await supabase.functions.invoke(
          'process-client-purchase',
          { body: { purchaseId: purchase.id } }
        );

        if (!validationError && validationResult) {
          if (validationResult.iaStatus === 'VALID' && validationResult.couponsAssigned?.length > 0) {
            setAssignedCoupons(validationResult.couponsAssigned);
            toast({
              title: '¡Documentos validados!',
              description: `Se te asignaron ${validationResult.couponsAssigned.length} cupón(es) para el sorteo.`,
            });
          } else if (validationResult.iaStatus === 'INVALID') {
            toast({
              title: 'Documentos no válidos',
              description: 'Por favor revisa tus documentos e intenta nuevamente.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'En revisión',
              description: 'Tu compra será revisada por nuestro equipo. Te notificaremos pronto.',
            });
          }
        }
      } catch (fnError) {
        console.error('Validation function error:', fnError);
        // Continue even if validation fails - purchase is still registered
      }

      // Show success modal
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

  const selectedProduct = products?.find(p => p.id === formData.productId);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl md:text-4xl font-black uppercase mb-4">
              <span className="text-foreground">REGISTRA TU</span>{" "}
              <span className="text-gradient-gold">COMPRA</span>
            </h1>
            <p className="text-muted-foreground">Completa el formulario para participar en el sorteo</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-8 shadow-card"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-card-foreground mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Datos Personales</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName" className="text-card-foreground">Nombre Completo *</Label>
                    <Input 
                      id="fullName" 
                      value={formData.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      placeholder="Tu nombre completo" 
                      required
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="ciNumber" className="text-card-foreground">Número de CI *</Label>
                    <Input 
                      id="ciNumber" 
                      value={formData.ciNumber}
                      onChange={(e) => handleChange('ciNumber', e.target.value)}
                      placeholder="12345678" 
                      required
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-card-foreground">Email *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="tu@email.com" 
                      required
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-card-foreground">WhatsApp *</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+591 70000000" 
                      required
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate" className="text-card-foreground">Fecha de Nacimiento *</Label>
                    <Input 
                      id="birthDate" 
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleChange('birthDate', e.target.value)}
                      required
                      className="mt-1" 
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-card-foreground mb-4">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Ubicación</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-card-foreground">Ciudad *</Label>
                    <Input 
                      id="city" 
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="Tu ciudad" 
                      required
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label className="text-card-foreground">Departamento *</Label>
                    <Select 
                      value={formData.department} 
                      onValueChange={(v) => handleChange('department', v)}
                    >
                      <SelectTrigger className="mt-1">
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
              </div>

              {/* Purchase Info */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-card-foreground mb-4">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Datos de Compra</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-card-foreground">Modelo de TV *</Label>
                    <Select 
                      value={formData.productId} 
                      onValueChange={(v) => handleChange('productId', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={loadingProducts ? "Cargando..." : "Seleccionar modelo"} />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.model_name} - {product.screen_size}" ({product.coupon_multiplier || 1} cupón{(product.coupon_multiplier || 1) > 1 ? 'es' : ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProduct && (
                      <p className="text-sm text-skyworth-gold mt-2">
                        🎫 Este modelo te da {selectedProduct.coupon_multiplier || 1} cupón{(selectedProduct.coupon_multiplier || 1) > 1 ? 'es' : ''} para el sorteo
                      </p>
                    )}
                    {serialValidation && (
                      <p className={`text-sm mt-2 ${serialValidation.valid ? 'text-green-500' : 'text-red-400'}`}>
                        {serialValidation.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="serialNumber" className="text-card-foreground">Número de Serie *</Label>
                    <Input 
                      id="serialNumber" 
                      value={formData.serialNumber}
                      onChange={(e) => handleChange('serialNumber', e.target.value)}
                      onBlur={() => validateSerial(formData.serialNumber)}
                      placeholder="Serie del producto (ej: SKW-2026-XXXXX)" 
                      required
                      className={`mt-1 ${validatingSerial ? 'opacity-70' : ''}`}
                    />
                    {validatingSerial && (
                      <p className="text-sm text-muted-foreground mt-1">Validando serial...</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="invoiceNumber" className="text-card-foreground">Número de Factura *</Label>
                    <Input 
                      id="invoiceNumber" 
                      value={formData.invoiceNumber}
                      onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                      placeholder="Número de factura" 
                      required
                      className="mt-1" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="purchaseDate" className="text-card-foreground">Fecha de Compra *</Label>
                    <Input 
                      id="purchaseDate" 
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => handleChange('purchaseDate', e.target.value)}
                      required
                      className="mt-1" 
                    />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-card-foreground mb-4">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Documentos</h3>
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
                          ? 'border-skyworth-green bg-skyworth-green/10' 
                          : 'border-border hover:border-primary'
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
                          <CheckCircle className="w-6 h-6 text-skyworth-green" />
                          <span className="text-sm text-card-foreground font-medium">
                            {files[key].file?.name}
                          </span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-card-foreground font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">Click para subir</p>
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
                />
                <Label htmlFor="terms" className="text-sm text-card-foreground leading-relaxed cursor-pointer">
                  Acepto los Términos y Condiciones de la promoción "Gana el Mundial Skyworth 2026" y autorizo el uso de mis datos personales.
                </Label>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full btn-cta-primary text-lg py-6"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>⚽ ANOTAR GOL Y REGISTRAR</>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </main>
      <Footer />
      <ChatBot />

      {/* Success Modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-skyworth-dark border-skyworth-gold/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-white flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-skyworth-green rounded-full flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              ¡GOOOL! 🎉
            </DialogTitle>
            <DialogDescription className="text-center text-gray-300 space-y-4">
              <p className="text-lg">
                Tu compra ha sido registrada exitosamente.
              </p>
              <p>
                Nuestro equipo validará tus documentos y te notificaremos por WhatsApp y Email cuando tus cupones sean asignados.
              </p>
              {assignedCoupons.length > 0 && (
                <div className="bg-skyworth-gold/20 rounded-lg p-4 mt-4">
                  <p className="font-bold text-skyworth-gold mb-2">Tus cupones:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {assignedCoupons.map(coupon => (
                      <span key={coupon} className="bg-skyworth-gold text-skyworth-dark px-3 py-1 rounded-full font-mono font-bold">
                        {coupon}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <Button 
            onClick={() => navigate('/')}
            className="w-full btn-cta-primary mt-4"
          >
            Volver al Inicio
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistroCliente;
