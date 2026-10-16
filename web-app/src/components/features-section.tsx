"use client";
import React from "react";
import { motion } from "framer-motion";

const features = [
  {
    icon: "📚",
    title: "Our Interview Library",
    description:
      "Access 500+ templates for Tech, Finance, Marketing, and Leadership roles curated by industry experts.",
    glowColor: "neon-glow-purple",
    iconBg: "bg-neon-purple/10",
  },
  {
    icon: "🌐",
    title: "Import from Web",
    description:
      "Paste a LinkedIn or Indeed URL. Our AI will instantly dissect the role and prepare tailored questions.",
    glowColor: "neon-glow-cyan",
    iconBg: "bg-neon-cyan/10",
  },
  {
    icon: "📄",
    title: "Upload a Job Post",
    description:
      "Have a PDF description? Drop it in. We'll generate a custom simulation based on the specific JD requirements.",
    glowColor: "neon-glow-purple",
    iconBg: "bg-neon-violet/10",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.175, 0.885, 0.32, 1.275],
    },
  }),
};

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 relative max-w-7xl mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface">
          Practice Anywhere
        </h2>
        <p className="text-on-surface-variant max-w-2xl mx-auto text-lg">
          Our studio adapts to your needs. Choose from thousands of roles or
          create your own custom stage.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={cardVariants}
            className="glass-card ghost-border p-8 rounded-2xl group hover:bg-white/5 transition-all duration-500 cursor-default"
          >
            <div
              className={`w-14 h-14 rounded-xl ${feature.iconBg} flex items-center justify-center mb-6 group-hover:${feature.glowColor} transition-all text-2xl`}
            >
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold font-manrope mb-3 text-on-surface">
              {feature.title}
            </h3>
            <p className="text-on-surface-variant leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
