"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const feedbackItems = [
  {
    icon: "🧠",
    title: "Content Analysis",
    description:
      "We analyze the semantic strength of your answers, ensuring you hit the key technical and soft-skill markers recruiters look for.",
    color: "text-neon-purple",
  },
  {
    icon: "🎙️",
    title: "Speech Analysis",
    description:
      "Identify filler words, analyze your pace, and optimize your pitch to sound professional and authoritative under pressure.",
    color: "text-neon-cyan",
  },
  {
    icon: "✅",
    title: "Confidence Analysis",
    description:
      "Our AI tracks your eye contact, posture, and facial cues to ensure your body language matches your verbal expertise.",
    color: "text-neon-violet",
  },
];

export default function FeedbackSection() {
  return (
    <section
      id="feedback"
      className="py-24 px-6 bg-surface-low/30 backdrop-blur-sm relative overflow-hidden"
    >
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-neon-purple/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* Text Side */}
          <motion.div
            className="lg:w-1/2 space-y-8"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface leading-tight">
              More Than a Score:
              <br />
              <span className="text-neon-cyan">
                Your Personal AI Feedback Report
              </span>
            </h2>

            <div className="space-y-6">
              {feedbackItems.map((item, i) => (
                <motion.div
                  key={item.title}
                  className="flex gap-5 items-start"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                >
                  <div className="mt-1 w-12 h-12 rounded-lg bg-surface-high flex items-center justify-center shrink-0 text-xl">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className={`text-lg font-bold font-manrope mb-1 ${item.color}`}>
                      {item.title}
                    </h4>
                    <p className="text-on-surface-variant leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Image Side */}
          <motion.div
            className="lg:w-1/2 w-full"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <div className="glass-card ghost-border rounded-3xl p-2 shadow-2xl group">
              <Image
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop"
                alt="AI analytics dashboard with performance metrics"
                width={800}
                height={600}
                className="w-full rounded-2xl shadow-inner object-cover aspect-[4/3] group-hover:scale-[1.02] transition-transform duration-700"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
