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
      description: "Recibe tus cupones únicos y prepárate para viajar a Monterrey con La Verde.",
      icon: Ticket,
    },
  ];

  return (
    <section className="py-20 px-4 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-cta/5 to-transparent" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-white tracking-wide mb-4">
            LA TÁCTICA PARA{" "}
            <span className="text-gradient-green">GANAR</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto font-body">
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
              <div className="relative z-10 w-14 h-14 rounded-xl bg-green-cta/20 flex items-center justify-center mb-6 group-hover:bg-green-cta/30 transition-colors">
                <step.icon className="w-7 h-7 text-green-cta" />
              </div>

              {/* Content */}
              <h3 className="relative z-10 font-display text-2xl tracking-wide mb-3 text-foreground">
                {step.title}
              </h3>
              <p className="relative z-10 text-muted-foreground text-sm leading-relaxed font-body">
                {step.description}
              </p>

              {/* Decorative line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-5 w-8 lg:w-10 h-0.5 bg-gradient-to-r from-green-cta/50 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StepsSection;