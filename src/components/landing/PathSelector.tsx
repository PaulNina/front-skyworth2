import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { User, Briefcase, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const PathSelector = () => {
  const { user, isSeller } = useAuth();

  const getSellerLink = () => {
    if (user && isSeller) {
      return "/dashboard-vendedor";
    }
    return "/login?redirect=dashboard-vendedor&role=seller";
  };

  const paths = [
    {
      id: "cliente",
      title: "SOY CLIENTE",
      description: "Compré un TV Skyworth y quiero registrar mi compra para participar en el sorteo.",
      icon: User,
      link: "/registro-cliente",
      variant: "blue" as const,
      badge: "PARTICIPA Y GANA",
    },
    {
      id: "vendedor",
      title: "SOY VENDEDOR",
      description: "Trabajo en una tienda autorizada y quiero registrar ventas para ganar puntos.",
      icon: Briefcase,
      link: getSellerLink(),
      variant: "green" as const,
      badge: "SUMA PUNTOS",
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black uppercase mb-4">
            <span className="text-foreground">ELIGE TU</span>{" "}
            <span className="text-gradient-gold">CAMINO</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Selecciona tu perfil para comenzar tu registro
          </p>
        </motion.div>

        {/* Path Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {paths.map((path, index) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
            >
              <Link to={path.link}>
                <div className={`path-card ${path.variant}`}>
                  {/* Badge */}
                  <div className="mb-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      path.variant === "blue" 
                        ? "bg-primary/20 text-primary" 
                        : "bg-secondary/20 text-secondary"
                    }`}>
                      {path.badge}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                    path.variant === "blue" 
                      ? "bg-primary/20" 
                      : "bg-secondary/20"
                  }`}>
                    <path.icon className={`w-8 h-8 ${
                      path.variant === "blue" ? "text-primary" : "text-secondary"
                    }`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-black uppercase mb-3 text-foreground">
                    {path.title}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {path.description}
                  </p>

                  {/* CTA */}
                  <div className={`inline-flex items-center gap-2 font-semibold ${
                    path.variant === "blue" ? "text-primary" : "text-secondary"
                  }`}>
                    Comenzar
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PathSelector;
