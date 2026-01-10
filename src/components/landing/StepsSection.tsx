import { motion } from "framer-motion";
import { ShoppingCart, FileCheck, Ticket } from "lucide-react";

const StepsSection = () => {
  const steps = [
    {
      number: "01",
      title: "COMPRA",
      description: "Adquiere tu TV Skyworth en cualquiera de nuestras tiendas autorizadas a nivel nacional.",
      icon: ShoppingCart,
    },
    {
      number: "02",
      title: "REGISTRA",
      description: "Sube tu factura y documentos. Nuestra IA validará tu compra automáticamente.",
      icon: FileCheck,
    },
    {
      number: "03",
      title: "PARTICIPA",
      description: "Recibe tus tickets únicos y prepárate para ganar el viaje al Mundial 2026.",
      icon: Ticket,
    },
  ];

  return (
    <section className="py-20 px-4 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-skyworth-blue-light/5 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-black uppercase mb-4">
            <span className="text-foreground">LA TÁCTICA PARA</span>{" "}
            <span className="text-gradient-gold">GANAR</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Sigue estos 3 simples pasos y conviértete en un ganador
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="step-card group"
            >
              {/* Step Number */}
              <span className="step-number">{step.number}</span>

              {/* Icon */}
              <div className="relative z-10 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <step.icon className="w-7 h-7 text-primary" />
              </div>

              {/* Content */}
              <h3 className="relative z-10 text-xl font-bold uppercase mb-3 text-foreground">
                {step.title}
              </h3>
              <p className="relative z-10 text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>

              {/* Decorative line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-5 w-8 lg:w-10 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepsSection;
