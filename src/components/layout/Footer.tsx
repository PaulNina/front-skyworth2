import { Trophy, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-skyworth-dark/50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                <Trophy className="w-5 h-5 text-skyworth-dark" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">SKYWORTH</h3>
                <p className="text-xs text-muted-foreground">Campaña Mundial 2026</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Compra tu TV Skyworth y participa por el viaje de tu vida al Mundial 2026.
              ¡Tu oportunidad de vivir la emoción del fútbol está aquí!
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 uppercase text-sm">Enlaces</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/registro-cliente" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Registrar Compra
                </Link>
              </li>
              <li>
                <Link to="/rankings" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Rankings
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Términos y Condiciones
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-foreground mb-4 uppercase text-sm">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                soporte@skyworth.com
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                +591 800 10 2026
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Bolivia
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Skyworth. Todos los derechos reservados.
            </p>
            <p className="text-xs text-muted-foreground">
              Promoción válida hasta el 30 de junio de 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
