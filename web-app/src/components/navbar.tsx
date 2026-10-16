"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

const navLinks = [
  { label: "Features",     href: "#features"     },
  { label: "Adaptive AI",  href: "#adaptive-ai"  },
  { label: "AI Feedback",  href: "#feedback"      },
  { label: "FAQ",          href: "#faq"           },
];

export default function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const unsub = scrollY.on("change", (y) => setScrolled(y > 24));
    return unsub;
  }, [scrollY]);

  return (
    <motion.header
      className="fixed top-0 w-full z-50 transition-all duration-300"
      animate={scrolled
        ? { backgroundColor: "rgba(255,255,255,0.85)", borderColor: "rgba(0,0,0,0.07)" }
        : { backgroundColor: "rgba(250,250,249,0.0)",  borderColor: "rgba(0,0,0,0.00)" }
      }
      style={{ backdropFilter: scrolled ? "blur(20px)" : "none", borderBottom: "1px solid" }}
    >
      <nav className="flex items-center justify-between px-6 md:px-10 py-3.5 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center shadow-md">
            <span className="text-sm font-bold text-white">🎯</span>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-on-surface font-manrope hidden sm:block">
            Mock Interview Studio
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-on-surface-muted hover:text-on-surface transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/interview"
          className="bg-gradient-to-br from-accent to-violet-accent text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:scale-[1.03] active:scale-[0.97] transition-all shadow-[0_4px_14px_rgba(79,70,229,0.35)]"
        >
          Start Free
        </Link>
      </nav>
    </motion.header>
  );
}
