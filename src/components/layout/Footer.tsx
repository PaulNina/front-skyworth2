import { Trophy, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

const Footer = () => {
  const { user } = useAuth();
  
  return (
    <footer className="border-t border-white/10 bg-pitch-900/80">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-cta to-green-cta/70 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">SKYWORTH</h3>
                <p className="text-xs text-white/50">El Sueño del Hincha</p>
              </div>
            </div>
            <p className="text-sm text-white/60 max-w-sm">
              Compra tu TV Skyworth y participa por el viaje de tu vida al repechaje rumbo a México 2026.
              ¡Tu oportunidad de alentar a La Verde está aquí!
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm">ENLACES</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-white/60 hover:text-green-cta transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/registrar-compra" className="text-sm text-white/60 hover:text-green-cta transition-colors">
                  Registrar Compra
                </Link>
              </li>

              {user && (
                <li>
                  <Link to="/resultados" className="text-sm text-white/60 hover:text-green-cta transition-colors">
                    Resultados
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm">CONTACTO</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-white/60">
                <Mail className="w-4 h-4 text-green-cta" />
                soporte@skyworth.com
              </li>
              <li className="flex items-center gap-2 text-sm text-white/60">
                <Phone className="w-4 h-4 text-green-cta" />
                800 10 2026
              </li>
              <li className="flex items-center gap-2 text-sm text-white/60">
                <MapPin className="w-4 h-4 text-green-cta" />
                Bolivia
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col items-center text-center gap-2">
            <p className="text-sm text-white/50">
              © 2026 Skyworth. Todos los derechos reservados.
            </p>
            <p className="text-xs text-white/40">
              Promoción válida hasta el 7 de marzo de 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
