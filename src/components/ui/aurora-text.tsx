import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AuroraTextProps {
  children: ReactNode;
  className?: string;
}

export const AuroraText = ({ children, className }: AuroraTextProps) => {
  return (
    <motion.span
      initial={{ backgroundPosition: "0% 50%" }}
      animate={{ backgroundPosition: "200% 50%" }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      className={cn(
        "bg-clip-text text-transparent bg-[length:200%_auto]",
        "bg-[linear-gradient(110deg,hsl(22_100%_55%),hsl(45_100%_60%),hsl(192_95%_55%),hsl(22_100%_55%))]",
        className
      )}
    >
      {children}
    </motion.span>
  );
};
