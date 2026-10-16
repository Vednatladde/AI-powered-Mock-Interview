"use client";
import React from "react";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Starter",
    price: "$0",
    period: "/forever",
    features: [
      "2 Mock Interviews / Month",
      "Basic Speech Analysis",
      "General Question Library",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro Performer",
    price: "$29",
    period: "/month",
    features: [
      "Unlimited Mock Interviews",
      "Deep Content & Speech Insights",
      "Video Confidence Feedback",
      "AI Role Matching",
    ],
    cta: "Go Pro",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Elite Studio",
    price: "$199",
    period: "/year",
    features: [
      "Everything in Pro",
      "Priority Feature Access",
      "Personal Branding Coaching",
    ],
    cta: "Upgrade Yearly",
    highlighted: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface">
          Choose Your Path to Mastery
        </h2>
        <p className="text-on-surface-variant text-lg">
          Simple, transparent pricing for every stage of your job search.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: i * 0.12,
              duration: 0.6,
              ease: [0.175, 0.885, 0.32, 1.275],
            }}
            className={`p-8 rounded-2xl flex flex-col relative ${
              plan.highlighted
                ? "bg-surface-high border-2 border-neon-purple scale-105 shadow-2xl z-10"
                : "glass-card ghost-border hover:border-outline-dim transition-colors"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-neon-purple text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                {plan.badge}
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-bold font-manrope text-on-surface">
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-extrabold font-manrope text-on-surface">
                  {plan.price}
                </span>
                <span className="ml-2 text-on-surface-variant">
                  {plan.period}
                </span>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className={`flex items-center gap-3 ${
                    plan.highlighted
                      ? "text-on-surface"
                      : "text-on-surface-variant"
                  }`}
                >
                  <span
                    className={`text-sm ${
                      plan.highlighted ? "text-neon-purple" : "text-neon-cyan"
                    }`}
                  >
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              className={`w-full py-3.5 rounded-xl font-bold transition-all ${
                plan.highlighted
                  ? "bg-gradient-to-br from-neon-purple to-neon-purple-deep text-white neon-glow-purple text-lg hover:scale-[1.02] active:scale-[0.98]"
                  : "border border-outline-dim text-on-surface hover:bg-white/5"
              }`}
            >
              {plan.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
