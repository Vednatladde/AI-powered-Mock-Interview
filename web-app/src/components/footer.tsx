import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-zinc-950 w-full py-12 border-t border-white/5">
      <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-12 max-w-7xl mx-auto gap-8">
        <div className="flex flex-col items-center md:items-start gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-neon-purple to-neon-purple-deep flex items-center justify-center">
              <span className="text-xs">🎯</span>
            </div>
            <span className="text-lg font-bold text-zinc-200 font-manrope">
              Mock Interview Studio
            </span>
          </div>
          <p className="text-zinc-500 text-sm tracking-wide">
            © 2024 Mock Interview Studio. The Neon Sanctum.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {["Features", "AI Feedback", "Pricing", "Privacy", "Terms"].map(
            (label) => (
              <Link
                key={label}
                href="#"
                className="text-zinc-500 hover:text-neon-cyan transition-colors text-sm tracking-wide"
              >
                {label}
              </Link>
            )
          )}
        </div>
      </div>
    </footer>
  );
}
