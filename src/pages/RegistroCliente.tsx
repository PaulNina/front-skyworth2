import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChatBot from "@/components/chat/ChatBot";
import { motion } from "framer-motion";
import { Upload, FileCheck, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const RegistroCliente = () => {
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
            <p className="text-muted-foreground">Completa el formulario para participar</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-8 shadow-card"
          >
            <form className="space-y-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-card-foreground mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Datos Personales</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre" className="text-card-foreground">Nombre Completo</Label>
                    <Input id="nombre" placeholder="Tu nombre" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="ci" className="text-card-foreground">Número de CI</Label>
                    <Input id="ci" placeholder="12345678" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-card-foreground">Email</Label>
                    <Input id="email" type="email" placeholder="tu@email.com" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="telefono" className="text-card-foreground">WhatsApp</Label>
                    <Input id="telefono" placeholder="+591 70000000" className="mt-1" />
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
                  <div>
                    <Label htmlFor="modelo" className="text-card-foreground">Modelo de TV</Label>
                    <Input id="modelo" placeholder="Ej: 55SUC9300" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="serie" className="text-card-foreground">Número de Serie</Label>
                    <Input id="serie" placeholder="Serie del producto" className="mt-1" />
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
                  {["CI Anverso", "CI Reverso", "Factura de Compra"].map((doc) => (
                    <div key={doc} className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-card-foreground font-medium">{doc}</p>
                      <p className="text-xs text-muted-foreground">Click para subir</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* T&C */}
              <div className="flex items-start gap-3 pt-4">
                <Checkbox id="terms" />
                <Label htmlFor="terms" className="text-sm text-card-foreground leading-relaxed">
                  Acepto los Términos y Condiciones de la promoción y autorizo el uso de mis datos.
                </Label>
              </div>

              <Button type="submit" className="w-full btn-cta-primary">
                ⚽ ANOTAR GOL Y REGISTRAR
              </Button>
            </form>
          </motion.div>
        </div>
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
};

export default RegistroCliente;
