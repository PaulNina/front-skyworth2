import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const sportBadgeVariants = cva(
  "inline-flex items-center font-display uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-blue-cta text-white",
        green: "bg-green-cta text-white",
        orange: "bg-orange-hit text-white",
        outline: "border-2 border-current bg-transparent",
        glass: "bg-white/10 text-white border border-white/20",
      },
      size: {
        sm: "px-2 py-1 text-xs rounded-md",
        default: "px-4 py-2 text-sm rounded-full",
        lg: "px-6 py-3 text-lg rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface SportBadgeProps 
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof sportBadgeVariants> {
  children: ReactNode;
}

const SportBadge = ({ 
  className, 
  variant, 
  size, 
  children, 
  ...props 
}: SportBadgeProps) => {
  return (
    <span 
      className={cn(sportBadgeVariants({ variant, size }), className)} 
      {...props}
    >
      {children}
    </span>
  );
};

export { SportBadge, sportBadgeVariants };