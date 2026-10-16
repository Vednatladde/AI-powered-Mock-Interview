"use client";
import React from "react";
import { motion } from "framer-motion";

export default function CtaSection() {
  return (
    <section className="py-24 px-6">
      <motion.div
        className="max-w-5xl mx-auto glass-card border border-white/10 rounded-[2rem] p-12 md:p-16 text-center relative overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.175, 0.885, 0.32, 1.275] }}
      >
        {/* Background Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-neon-purple/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-neon-cyan/20 blur-[100px] rounded-full pointer-events-none" />

        <h2 className="text-4xl md:text-5xl font-manrope font-extrabold mb-6 text-on-surface relative z-10">
          Ready to land that offer?
        </h2>
        <p className="text-xl text-on-surface-variant mb-10 max-w-2xl mx-auto relative z-10">
          Join thousands of job seekers who have mastered their interview
          performance with AI.
        </p>
        <button className="relative z-10 bg-gradient-to-br from-neon-purple to-neon-purple-deep text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all neon-glow-purple">
          Start Your Performance Ritual
        </button>
      </motion.div>
    </section>
  );
}
