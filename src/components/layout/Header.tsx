import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Menu, X, User, LayoutDashboard, LogOut, Store, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isSeller, isAdmin, signOut } = useAuth();

  const navLinks = [
    { href: "/", label: "Inicio" },
    { href: "/registro-cliente", label: "Registrar Compra" },
    { href: "/rankings", label: "Rankings" },
    { href: "/resultados", label: "Resultados" },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Seller link - solo para vendedores o usuarios no autenticados
  const getSellerLink = () => {
    if (user && isSeller) {
      return "/dashboard-vendedor";
    }
    return "/login?redirect=dashboard-vendedor&role=seller";
  };

  const getSellerLabel = () => {
    if (user && isSeller) {
      return "Mi Panel Vendedor";
    }
    return "Soy Vendedor";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-effect">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
              <Trophy className="w-5 h-5 text-skyworth-dark" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-foreground text-lg">SKYWORTH</span>
              <span className="text-primary text-xs block -mt-1">MUNDIAL 2026</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Mostrar botón de vendedor solo si NO es admin o si ES seller */}
            {(!user || isSeller || !isAdmin) && (
              <Link to={getSellerLink()} className="hidden sm:block">
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <Store className="w-4 h-4 mr-2" />
                  {getSellerLabel()}
                </Button>
              </Link>
            )}
            
            {/* Admin badge y link - solo para admins */}
            {isAdmin && (
              <Link to="/admin" className="hidden sm:flex items-center gap-2">
                <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
                <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                  <LayoutDashboard className="w-4 h-4" />
                </Button>
              </Link>
            )}

            {user && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => signOut()}
                className="hidden sm:flex text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-foreground"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background"
          >
            <nav className="p-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border mt-2 space-y-2">
                {/* Portal vendedor - solo si no es admin o si es seller */}
                {(!user || isSeller || !isAdmin) && (
                  <Link
                    to={getSellerLink()}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary"
                  >
                    <Store className="w-4 h-4" />
                    {getSellerLabel()}
                  </Link>
                )}
                
                {/* Panel Admin - solo para admins */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-500 bg-amber-500/10"
                  >
                    <Shield className="w-4 h-4" />
                    Panel Administrador
                  </Link>
                )}
                
                {user && (
                  <button
                    onClick={() => {
                      signOut();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;