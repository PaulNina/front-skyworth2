import { motion } from "framer-motion";
import { Tv, Star, Ticket } from "lucide-react";

const ProductsSection = () => {
  const products = [
    {
      id: 1,
      name: 'Smart TV 32"',
      tier: "T1",
      tickets: 1,
      image: null,
    },
    {
      id: 2,
      name: 'Smart TV 43"-50"',
      tier: "T2",
      tickets: 2,
      image: null,
    },
    {
      id: 3,
      name: 'Smart TV 55"-65"',
      tier: "T3",
      tickets: 3,
      image: null,
    },
  ];

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-black uppercase mb-4">
            <span className="text-foreground">MODELOS</span>{" "}
            <span className="text-gradient-gold">PARTICIPANTES</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Mientras más grande tu TV, más tickets ganas
          </p>
        </motion.div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl overflow-hidden shadow-card group hover:shadow-glow-gold transition-all duration-300"
            >
              {/* Product Image */}
              <div className="relative h-48 bg-gradient-to-br from-skyworth-blue-light to-skyworth-blue-medium flex items-center justify-center">
                <Tv className="w-24 h-24 text-foreground/20" />
                
                {/* Tier Badge */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {product.tier}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-card-foreground mb-2">
                  {product.name}
                </h3>
                
                <div className="flex items-center gap-2 text-primary">
                  <Ticket className="w-5 h-5" />
                  <span className="font-bold text-lg">{product.tickets} ticket{product.tickets > 1 ? "s" : ""}</span>
                </div>

                <div className="mt-4 flex items-center gap-1">
                  {[...Array(product.tickets)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                  {[...Array(3 - product.tickets)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-muted" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
