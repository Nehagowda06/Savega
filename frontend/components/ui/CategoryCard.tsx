"use client";

import { motion } from "framer-motion";

interface CategoryCardProps {
  name: string;
  image: string;
  color: string;
  isActive?: boolean;
  onClick?: () => void;
}

export default function CategoryCard({ name, image, color, isActive = false, onClick }: CategoryCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      transition={{ type: "spring", stiffness: 600, damping: 15 }}
      className="w-[62px] flex flex-col items-center flex-shrink-0 cursor-pointer select-none bg-transparent p-0"
    >
      <motion.div
        animate={{ scale: isActive ? 1.04 : 1, y: isActive ? -2 : 0 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className={`w-[40px] h-[40px] ${color} rounded-[13px] flex items-center justify-center relative overflow-hidden`}
        style={{
          boxShadow: isActive
            ? "0 0 0 2px #6941c6, 0 4px 14px rgba(105,65,198,0.22)"
            : "0 4px 12px rgba(6,31,65,0.12)",
        }}
      >
        {/* Gloss overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/5 pointer-events-none" />
        {/* Shine spot */}
        <div className="absolute -top-3 -left-3 w-12 h-12 rounded-full bg-white/30 blur-lg pointer-events-none" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name}
          width={26}
          height={26}
          className="w-[26px] h-[26px] object-contain relative z-10"
          style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.18))" }}
          loading="lazy"
        />
      </motion.div>

      <motion.span
        animate={{
          color: isActive ? "#6941c6" : "#4a5568",
          fontWeight: isActive ? 600 : 400,
        }}
        transition={{ duration: 0.15 }}
        className="block w-full text-[9px] mt-1.5 text-center leading-tight break-words"
        title={name}
      >
        {name}
      </motion.span>
    </motion.button>
  );
}
