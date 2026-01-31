import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatBot from "@/components/chat/ChatBot";
import { motion } from "framer-motion";
import { Upload, FileCheck, User, CreditCard, MapPin, Loader2, CheckCircle, Copy, Trophy, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { API_BASE_URL, API_ENDPOINTS, ApiResponse } from "@/config/api";
import Swal from 'sweetalert2';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { validateBolivianPhone } from "@/lib/phoneValidation";

// Type declarations for tracking pixels
declare global {
  interface Window {
    fbq?: (action: string, event: string, params?: Record<string, unknown>) => void;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
    };
  }
}

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

interface SerialValidationResult {
  valido: boolean;
  mensaje?: string;
  error?: string;
  productoId?: number;
  productoNombre?: string;
  modeloTv?: string;
  pulgadas?: number;
  cantidadCupones?: number;
}

interface RegistroResult {
  registroId?: number;
  cupones?: string[];
  codigos_cupones?: string[]; // Legacy support
  mensaje?: string;
  estado?: string; // PENDIENTE or APROBADO
  cantidadCupones?: number;
  registroExitoso?: boolean;
}

const RegistroCliente = () => {
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
    purchaseDate: '',
    termsAccepted: false,
    modeloTv: '',
    tamanoTv: ''
  });

  const [termsUrl, setTermsUrl] = useState<string | null>(null);
  const [campaignDates, setCampaignDates] = useState<{
    startDate: string;
    endDate: string;
  }>({ startDate: '2026-01-22', endDate: '2026-03-07' }); // Valores por defecto

  const [validatingSerial, setValidatingSerial] = useState(false);
  const [serialValidation, setSerialValidation] = useState<{
    valid: boolean;
    message: string;
    productId?: string;
    productName?: string;
    couponsCount?: number;
    modeloTv?: string;
    pulgadas?: number;
  } | null>(null);

  const [files, setFiles] = useState<{
    tagPoliza: FileUpload;
    polizaGarantia: FileUpload;
    invoice: FileUpload;
  }>({
    tagPoliza: { file: null, preview: null, uploading: false, url: null },
    polizaGarantia: { file: null, preview: null, uploading: false, url: null },
    invoice: { file: null, preview: null, uploading: false, url: null },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [invalidSerialChar, setInvalidSerialChar] = useState<string | null>(null);
  const [birthDateError, setBirthDateError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleChange = (field: string, value: string | boolean) => {
    // Validar serial number - solo letras y números
    if (field === 'serialNumber' && typeof value === 'string') {
      // Detectar caracteres no permitidos
      const invalidChars = value.match(/[^a-zA-Z0-9]/g);
      if (invalidChars && invalidChars.length > 0) {
        // Mostrar mensaje con el símbolo inválido
        setInvalidSerialChar(invalidChars[0]);
        // Limpiar el mensaje después de 3 segundos
        setTimeout(() => setInvalidSerialChar(null), 3000);
        // No actualizar el valor si contiene caracteres inválidos
        return;
      }

      setInvalidSerialChar(null);
    }
    
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
    
    // Validar fecha de nacimiento (18 a 100 años)
    if (field === 'birthDate' && typeof value === 'string') {
      const selectedDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - selectedDate.getFullYear();
      const m = today.getMonth() - selectedDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) {
        age--;
      }

      if (age < 18) {
        setBirthDateError('Debes ser mayor de 18 años para participar');
      } else if (age > 100) {
        setBirthDateError('La fecha de nacimiento no es válida');
      } else {
        setBirthDateError(null);
      }
    }
    
    // Validar fecha de compra
    if (field === 'purchaseDate' && typeof value === 'string') {
      const selectedDate = new Date(value);
      selectedDate.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación justa

      const startDate = new Date(campaignDates.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(campaignDates.endDate);
      endDate.setHours(0, 0, 0, 0);

      // Si la fecha seleccionada está fuera del rango
      if (selectedDate < startDate || selectedDate > endDate) {
        toast({
          title: 'Fecha no válida para la promoción',
          description: `La promoción solo es válida para compras realizadas del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}.`,
          variant: 'destructive',
          duration: 5000,
        });
        // No actualizamos el estado o lo reseteamos a vacío si deseas ser estricto
        // Opcional: permitir selección pero mostrar error. El usuario pidió "que no pueda registrar otra fecha"
        // Así que lo mejor es NO actualizar el estado con la fecha inválida
        return; 
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset serial validation when serial changes
    if (field === 'serialNumber') {
      setSerialValidation(null);
    }
  };

  // Validar serial en tiempo real con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      // Solo validar si tiene longitud suficiente y no está vacío
      if (formData.serialNumber && formData.serialNumber.length >= 4) {
        validateSerial(formData.serialNumber);
      } else {
         setSerialValidation(null);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.serialNumber]);

  // Auto-fill purchase date with today's date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    setFormData(prev => ({ ...prev, purchaseDate: today }));
  }, []);

  // Fetch Public Config (Terms URL and Campaign Dates)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/registro/config`);
        if (res.ok) {
            const json = await res.json();
            if (!json.error && json.data) {
                // Terms URL
                if (json.data.terms_url) {
                    const url = json.data.terms_url;
                    if (url.startsWith('http')) {
                        setTermsUrl(url);
                    } else {
                        setTermsUrl(`${API_BASE_URL}${url}`);
                    }
                }
                // Campaign Dates
                if (json.data.campaign_start_date && json.data.campaign_end_date) {
                    setCampaignDates({
                        startDate: json.data.campaign_start_date,
                        endDate: json.data.campaign_end_date
                    });
                }
            }
        }
      } catch (err) {
        console.error("Error fetching config", err);
      }
    };
    fetchConfig();
  }, []);

  // Validate serial number via backend API
  const validateSerial = async (serial: string) => {
    if (!serial || serial.length < 5) {
      setSerialValidation(null);
      return;
    }

    setValidatingSerial(true);
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REGISTRO.VALIDAR_SERIAL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serial: serial.toUpperCase().trim(),
          tipo: 'comprador'
        }),
      });

      const result: ApiResponse<SerialValidationResult> = await response.json();

      if (result.error) {
        setSerialValidation({
          valid: false,
          message: result.mensaje || 'Serial no disponible',
        });
        return;
      }

      const data = result.data;
      const couponCount = data.cantidadCupones || 1;
      
      setSerialValidation({
        valid: data.valido,
        message: data.valido 
          ? `✓ Serial válido - ${couponCount} cupón${couponCount > 1 ? 'es' : ''}`
          : data.error || data.mensaje || 'Serial no disponible',
        productId: data.productoId?.toString(),
        productName: data.modeloTv,
        couponsCount: couponCount,
        modeloTv: data.modeloTv,
        pulgadas: data.pulgadas
      });

      // Auto-select product if valid
      if (data.valido) {
        setFormData(prev => ({ 
          ...prev, 
          productId: data.productoId ? data.productoId.toString() : prev.productId,
          modeloTv: data.modeloTv,
          tamanoTv: data.pulgadas?.toString() || ''
        }));
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

  const handleFileChange = (field: 'tagPoliza' | 'polizaGarantia' | 'invoice', file: File | null) => {
    if (file) {
      const preview = URL.createObjectURL(file);
      setFiles(prev => ({
        ...prev,
        [field]: { ...prev[field], file, preview }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todos los campos requeridos y mostrar mensaje detallado
    const missingFields: string[] = [];
    const missingImages: string[] = [];

    // Validar campos de texto
    if (!formData.fullName) missingFields.push('Nombre Completo');
    if (!formData.ciNumber) missingFields.push('Número de CI');
    if (!formData.email) missingFields.push('Email');
    if (!formData.phone) missingFields.push('WhatsApp');
    if (!formData.birthDate) missingFields.push('Fecha de Nacimiento');
    if (!formData.city) missingFields.push('Ciudad');
    if (!formData.department) missingFields.push('Departamento');
    if (!formData.serialNumber) missingFields.push('Número de Serie');
    if (!formData.purchaseDate) missingFields.push('Fecha de Compra');

    // Validar imágenes OBLIGATORIAS
    if (!files.invoice.file) missingImages.push('Foto de Nota de Venta/Factura');
    if (!files.polizaGarantia.file) missingImages.push('Foto de Póliza de Garantía');
    if (!files.tagPoliza.file) missingImages.push('Foto del TAG de la Póliza');

    // Validar términos
    if (!formData.termsAccepted) missingFields.push('Aceptar Términos y Condiciones');

    // Si hay campos o imágenes faltantes, mostrar SweetAlert detallado
    if (missingFields.length > 0 || missingImages.length > 0) {
      let htmlContent = '<div style="text-align: left;">';
      
      if (missingFields.length > 0) {
        htmlContent += '<p style="font-weight: bold; margin-bottom: 10px; color: #dc2626;">📝 Campos Faltantes:</p>';
        htmlContent += '<ul style="margin-left: 20px; margin-bottom: 15px;">';
        missingFields.forEach(field => {
          htmlContent += `<li style="margin-bottom: 5px;">${field}</li>`;
        });
        htmlContent += '</ul>';
      }
      
      if (missingImages.length > 0) {
        htmlContent += '<p style="font-weight: bold; margin-bottom: 10px; color: #dc2626;">📸 Imágenes Faltantes:</p>';
        htmlContent += '<ul style="margin-left: 20px;">';
        missingImages.forEach(image => {
          htmlContent += `<li style="margin-bottom: 5px;">${image}</li>`;
        });
        htmlContent += '</ul>';
      }
      
      htmlContent += '</div>';

      await Swal.fire({
        title: '⚠️ Datos Incompletos',
        html: htmlContent,
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#d4af37',
        background: '#1a1a1a',
        color: '#ffffff',
        customClass: {
          popup: 'border border-white/10 rounded-xl',
        }
      });
      return;
    }

    // Validar que el serial esté validado y tenga producto asociado
    if (!serialValidation?.valid || !serialValidation.productId) {
      await Swal.fire({
        title: '❌ Serial Inválido',
        text: 'Debes ingresar un número de serie válido antes de continuar.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#d4af37',
        background: '#1a1a1a',
        color: '#ffffff',
      });
      return;
    }

    // Validar teléfono
    const phoneValidation = validateBolivianPhone(formData.phone);
    if (!phoneValidation.isValid) {
      await Swal.fire({
        title: '❌ Número de Teléfono Inválido',
        text: phoneValidation.error || 'El número de teléfono debe ser un celular boliviano de 8 dígitos que empiece con 6 o 7.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#d4af37',
        background: '#1a1a1a',
        color: '#ffffff',
      });
      return;
    }

    // Validate age (18+)
    const birthDate = new Date(formData.birthDate);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18 || birthDateError) {
      await Swal.fire({
        title: '❌ Edad No Válida',
        text: 'Debes ser mayor de 18 años para participar.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#d4af37',
        background: '#1a1a1a',
        color: '#ffffff',
      });
      return;
    }

    setIsSubmitting(true);

    // Track form submission attempt (Meta & TikTok)
    if (typeof window !== 'undefined') {
      // Meta Pixel - InitiateCheckout
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', {
          content_name: 'Registro de Compra',
          content_category: 'TV Skyworth',
          value: formData.tamanoTv,
          currency: 'BOB'
        });
      }
      // TikTok Pixel - InitiateCheckout
      if (window.ttq) {
        window.ttq.track('InitiateCheckout', {
          content_name: 'Registro de Compra',
          content_type: 'product',
          value: formData.tamanoTv,
          currency: 'BOB'
        });
      }
    }

    try {
      // Create FormData for multipart request (includes files)
      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('nombre', formData.fullName);
      formDataToSend.append('ci', formData.ciNumber);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('telefono', formData.phone);
      formDataToSend.append('lugarEmision', formData.department);
      formDataToSend.append('tipoDocumentoIdentidad', 'CI'); 
      
      // Fields to be supported by backend update
      formDataToSend.append('ciudad', formData.city);
      formDataToSend.append('fechaNacimiento', formData.birthDate);
      formDataToSend.append('fechaCompra', formData.purchaseDate);
      
      formDataToSend.append('serialTv', formData.serialNumber.toUpperCase().trim());
      formDataToSend.append('modeloTv', formData.modeloTv);
      formDataToSend.append('tamanoTv', formData.tamanoTv);
      
      // Add files
      if (files.tagPoliza.file) {
        formDataToSend.append('tagPoliza', files.tagPoliza.file);
      }
      if (files.polizaGarantia.file) {
        formDataToSend.append('polizaGarantia', files.polizaGarantia.file);
      }
      if (files.invoice.file) {
        formDataToSend.append('notaVenta', files.invoice.file);
      }

      // Send registration request to backend
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REGISTRO.SKYWORTH}`, {
        method: 'POST',
        body: formDataToSend,
      });

      const result: ApiResponse<RegistroResult> = await response.json();

      if (result.error || !response.ok) {
        throw new Error(result.mensaje || 'No se pudo registrar la compra');
      }

      // Support both camelCase (new backend) and snake_case (old backend)
      const coupons = result.data?.cupones || result.data?.codigos_cupones || [];

      toast({
        title: '¡Registro exitoso!',
        description: coupons.length
          ? `Se generaron ${coupons.length} cupón(es) para el sorteo.`
          : 'Tu compra fue registrada.',
      });

      // Track successful registration (Meta & TikTok)
      if (typeof window !== 'undefined') {
        // Meta Pixel - CompleteRegistration
        if (window.fbq) {
          window.fbq('track', 'CompleteRegistration', {
            content_name: 'Registro de Compra Completado',
            content_category: 'TV Skyworth',
            value: formData.tamanoTv,
            currency: 'BOB',
            num_coupons: coupons.length
          });
        }
        // TikTok Pixel - CompleteRegistration
        if (window.ttq) {
          window.ttq.track('CompleteRegistration', {
            content_name: 'Registro de Compra Completado',
            content_type: 'product',
            value: formData.tamanoTv,
            currency: 'BOB'
          });
        }
      }

      // Navigate to success page with data
      navigate('/registro-exitoso', {
        state: {
          formData: {
            fullName: formData.fullName,
            phone: formData.phone,
            email: formData.email
          },
          coupons: coupons,
          registrationResult: result.data
        },
        replace: true
      });

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

  // Reset form completely
  const resetForm = () => {
    setFormData({
      fullName: '',
      ciNumber: '',
      email: '',
      phone: '',
      city: '',
      department: '',
      birthDate: '',
      productId: '',
      serialNumber: '',
      purchaseDate: '',
      termsAccepted: false,
      modeloTv: '',
      tamanoTv: ''
    });
    setFiles({
      tagPoliza: { file: null, preview: null, uploading: false, url: null },
      polizaGarantia: { file: null, preview: null, uploading: false, url: null },
      invoice: { file: null, preview: null, uploading: false, url: null },
    });
    setSerialValidation(null);
    window.scrollTo(0, 0);
  };

  // Background image state matching Index.tsx
  const [bgImage, setBgImage] = useState("/fondo_web2.webp");

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setBgImage("/fondo_mobile_1080.webp");
      } else {
        setBgImage("/fondo_web2.webp");
      }
    };

    handleResize(); // Check on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Background Image - Matching Index.tsx */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat bg-black"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      {/* Overlay */}
      <div className="fixed inset-0 z-0 bg-black/30 bg-blend-overlay pointer-events-none" />

      <Header />
      <main className="pt-24 pb-16 px-4 relative z-10">
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
                      placeholder="7XXXXXXX (8 dígitos)" 
                      required
                      maxLength={8}
                      className={`mt-1 ${phoneError ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {phoneError && (
                      <p className="text-sm text-red-500 mt-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {phoneError}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="birthDate" className="text-card-foreground">Fecha de Nacimiento *</Label>
                    <Input 
                      id="birthDate" 
                      type="date"
                      min="1900-01-01"
                      max={new Date().toISOString().split('T')[0]}
                      value={formData.birthDate}
                      onChange={(e) => handleChange('birthDate', e.target.value)}
                      required
                      className={`mt-1 ${birthDateError ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {birthDateError && (
                      <p className="text-sm text-red-500 mt-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {birthDateError}
                      </p>
                    )}
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
                    <div className="flex items-center gap-2 mb-1.5">
                      <Label htmlFor="serialNumber" className="text-card-foreground">Número de Serie *</Label>
                      <TooltipProvider>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                             <Info className="h-4 w-4 text-skyworth-gold cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-destructive text-white border-destructive text-xs font-bold px-3 py-2 max-w-[250px]">
                            <p>NO incluir el guión medio(-) al ingresar el serial.</p>
                            <p>Ejemplo: 2540400M00000</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input 
                      id="serialNumber" 
                      value={formData.serialNumber}
                      onChange={(e) => handleChange('serialNumber', e.target.value.toUpperCase())}

                      placeholder="Ingresa el número de serie del TV" 
                      required
                      className={`mt-1 ${validatingSerial ? 'opacity-70' : ''}`}
                    />
                    {invalidSerialChar && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-2 font-medium">
                        <AlertTriangle className="w-4 h-4" />
                        NO incluir el símbolo "{invalidSerialChar}" al ingresar el serial.
                      </p>
                    )}
                    {validatingSerial && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Validando serial...
                      </p>
                    )}
                    {serialValidation && (
                      <div className={`mt-2 p-3 rounded-lg ${serialValidation.valid ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                        {serialValidation.valid ? (
                          <div className="space-y-1">
                            <p className="text-green-500 font-medium flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Serial válido
                            </p>
                            <p className="text-sm text-card-foreground">
                              <span className="font-semibold">Modelo:</span> {serialValidation.productName}
                            </p>
                            <p className="text-sm text-skyworth-gold">
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
                    <Label htmlFor="purchaseDate" className="text-card-foreground">Fecha de Compra *</Label>
                    <Input 
                      id="purchaseDate" 
                      type="date"
                      min={campaignDates.startDate}
                      max={campaignDates.endDate}
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
                    { key: 'invoice' as const, label: 'Foto de Nota de Venta/Factura *' },
                    
                    { key: 'polizaGarantia' as const, label: 'Foto de Póliza de Garantía *' },
                    { key: 'tagPoliza' as const, label: 'Foto del TAG de la Póliza (Número de Serie) *' },
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
                <Label htmlFor="terms" className="text-sm text-card-foreground leading-relaxed">
                  Acepto los <span className="text-skyworth-gold hover:underline cursor-pointer font-semibold" onClick={(e) => {
                    e.preventDefault();
                    if (termsUrl) {
                        window.open(termsUrl, '_blank');
                    } else {
                        setShowTerms(true);
                    }
                  }}>Términos y Condiciones</span> de la promoción "EL SUEÑO DEL HINCHA SKYWORTH" y autorizo el uso de mis datos personales.
                </Label>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full btn-cta-primary text-lg py-6"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Revisando VAR... ⚽
                  </span>
                ) : (
                  <>⚽ ANOTAR GOL Y REGISTRAR</>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
      <ChatBot />

      {/* Terms Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="bg-skyworth-dark border-white/10 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white mb-4">Términos y Condiciones</DialogTitle>
            <DialogDescription className="text-gray-300 space-y-4 text-sm text-left">
              <p className="font-bold text-white">RESPONSABILIDADES, CONDICIONES Y RESTRICCIONES:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>La empresa Grupo Empresarial Quisbert S.R.L. es la empresa distribuidora mayorista de la marca Skyworth en Bolivia, comercializando exclusivamente los productos a través de ventas mayoristas y minoristas en mercados y tiendas a nivel nacional.</li>
                <li>Participan en esta promoción solo los productos comercializados por Grupo Empresarial Quisbert S.R.L. que tengan GARANTÍA VÁLIDA.</li>
                <li>Grupo Empresarial Quisbert S.R.L., no se hará cargo de ningún gasto incurrido por la persona ganadora del premio o paquete, para acceder al mismo. Por ejemplo si el cliente reside en otra ciudad que no sea Santa Cruz de La Sierra, ciudad de donde saldrá el vuelo, el transporte del ganador va por cuenta propia.</li>
                <li>Los datos personales de los ganadores, deben coincidir necesariamente con el registro de la póliza de garantía y de la factura, nota de venta o recibo del producto adquirido.</li>
                <li>El premio o paquete es personal e intransferible, no podrá ser sustituido por otros bienes distintos a los indicados en esta promoción, ni solicitar su valor en efectivo.</li>
                <li>Los Participantes solo podrán inscribir el producto una sola vez, ya que el sistema rechazará automáticamente la inscripción si se trata de participar con el mismo producto por segunda o más veces.</li>
                <li>Con el fin de hacer público el resultado de la promoción, los ganadores autorizan a que sus nombres e imágenes aparezcan en publicaciones y demás medios y en general en todo material de divulgación de las actividades posteriores a la promoción, como entrega y recibo de premios, sin que implique remuneración o compensación adicional reclamos por derecho de imagen.</li>
                <li>El ganador debe ser mayor de 18 años y ser ciudadano boliviano o ciudadano extranjero con residencia legal en Bolivia.</li>
                <li>La empresa Grupo Empresarial Quisbert S.R.L., o Skyworth, no responderán por los daños y perjuicios sufridos por los clientes ganadores por el uso de los premios que se entreguen en virtud de la promoción, ocasionados en el disfrute del premio. Se entiende que los clientes ganadores actúan por su propia cuenta y riesgo. Los clientes ganadores serán responsables de cualquier daño y/o perjuicio que por su acción u omisión le causen a las instalaciones del hotel.</li>
                <li>En caso de pérdida de vuelo por parte del ganador, ni la empresa Grupo Empresarial Quisbert S.R.L., ni Skyworth responderán por lo que se da por sentado la pérdida del premio. Los ganadores se deberán acoger a las siguientes condiciones:
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>El ganador debe cumplir con los requerimientos de vacunación exigidos por el país relacionado en el viaje para poder acceder al premio.</li>
                    <li>El ganador debe cumplir con los requisitos de los eventos y/o locaciones que visiten durante el programa: Uso adecuado del tapabocas, distanciamiento social y/o presentación de certificado de vacunación en caso de que aplique.</li>
                  </ul>
                </li>
              </ol>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistroCliente;
