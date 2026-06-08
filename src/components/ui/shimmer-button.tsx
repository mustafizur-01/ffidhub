import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "relative inline-flex h-11 overflow-hidden rounded-xl p-[1.5px] focus:outline-none focus:ring-2 focus:ring-primary",
          className
        )}
        {...(props as any)}
      >
        <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,hsl(22_100%_52%)_0%,hsl(35_100%_60%)_50%,hsl(22_100%_52%)_100%)]" />
        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-[10px] bg-background px-6 py-1 text-sm font-bold text-foreground backdrop-blur-3xl gap-2">
          {children}
        </span>
      </motion.button>
    );
  }
);
ShimmerButton.displayName = "ShimmerButton";
