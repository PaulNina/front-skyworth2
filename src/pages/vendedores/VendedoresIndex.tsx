/**
 * VendedoresIndex - Página de entrada al mundo vendedores
 * Ruta: /vendedores
 */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, LogIn, UserPlus, Trophy, TrendingUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PitchBackground from "@/components/ui/PitchBackground";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function VendedoresIndex() {
  return (
    <PitchBackground>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-green-cta to-green-cta/70 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="h-10 w-10 text-white" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white mb-4">
              PORTAL <span className="text-gradient-orange">VENDEDORES</span>
            </h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Únete al programa de incentivos Skyworth. Gana puntos por cada TV vendido y participa por increíbles premios.
            </p>
          </motion.div>

          {/* CTA Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-6 mb-12"
          >
            <Card className="glass-panel border-green-cta/30 hover:border-green-cta/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-14 h-14 bg-green-cta/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogIn className="h-7 w-7 text-green-cta" />
                </div>
                <CardTitle className="text-white font-display text-xl">YA TENGO CUENTA</CardTitle>
                <CardDescription className="text-white/60">
                  Ingresa a tu dashboard para registrar ventas y ver tu ranking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/vendedores/login">
                  <Button className="w-full btn-cta-primary font-display">
                    INGRESAR
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="glass-panel border-orange-hit/30 hover:border-orange-hit/50 transition-colors">
              <CardHeader className="text-center">
                <div className="w-14 h-14 bg-orange-hit/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="h-7 w-7 text-orange-hit" />
                </div>
                <CardTitle className="text-white font-display text-xl">SOY NUEVO</CardTitle>
                <CardDescription className="text-white/60">
                  Regístrate para empezar a acumular puntos y cupones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/vendedores/registro">
                  <Button className="w-full btn-cta-secondary font-display">
                    REGISTRARME
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="font-display text-2xl text-white text-center mb-8">
              BENEFICIOS DEL PROGRAMA
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 text-center rounded-2xl">
                <Trophy className="h-10 w-10 text-orange-hit mx-auto mb-4" />
                <h3 className="font-display text-lg text-white mb-2">GANA PUNTOS</h3>
                <p className="text-white/60 text-sm">
                  Acumula puntos por cada TV Skyworth que vendas
                </p>
              </div>
              <div className="glass-panel p-6 text-center rounded-2xl">
                <TrendingUp className="h-10 w-10 text-green-cta mx-auto mb-4" />
                <h3 className="font-display text-lg text-white mb-2">COMPITE</h3>
                <p className="text-white/60 text-sm">
                  Sube en el ranking y destaca en tu ciudad
                </p>
              </div>
              <div className="glass-panel p-6 text-center rounded-2xl">
                <Package className="h-10 w-10 text-blue-cta mx-auto mb-4" />
                <h3 className="font-display text-lg text-white mb-2">CUPONES</h3>
                <p className="text-white/60 text-sm">
                  Obtén cupones para el sorteo del viaje a México
                </p>
              </div>
            </div>
          </motion.div>

          {/* Link to ranking */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-12"
          >
            <Link to="/vendedores/ranking" className="text-green-cta hover:text-green-cta/80 transition-colors font-medium">
              Ver Ranking de Vendedores →
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </PitchBackground>
  );
}
