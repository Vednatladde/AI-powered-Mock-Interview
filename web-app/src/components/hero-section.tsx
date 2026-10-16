"use client";
import React from "react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-neon-purple/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-neon-cyan/10 blur-[120px] rounded-full pointer-events-none" />

      <ContainerScroll
        titleComponent={
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-surface-high/50 border border-outline-dim/20 px-4 py-2 rounded-full backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-neon-cyan animate-pulse" />
              <span className="text-xs font-medium text-neon-cyan uppercase tracking-widest">
                AI Performance Engine Active
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-manrope font-extrabold tracking-tight leading-[1.1] text-on-surface">
              Ace Your Job{" "}
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-purple-deep">
                Interview with AI
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Practice with realistic mock interviews, receive personalized
              feedback, and land your dream job with our high-fidelity AI coach.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <button className="bg-gradient-to-br from-neon-purple to-neon-purple-deep text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all neon-glow-purple">
                Start Free Trial
              </button>
              <button className="bg-white/5 border border-white/10 text-on-surface px-8 py-4 rounded-xl font-bold text-lg backdrop-blur-md hover:bg-white/10 transition-all">
                Watch Demo
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {["🧑‍💼", "👩‍💻", "👨‍🎓"].map((emoji, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full bg-surface-high border-2 border-surface-lowest flex items-center justify-center text-sm"
                  >
                    {emoji}
                  </div>
                ))}
              </div>
              <p className="text-sm text-on-surface-variant font-medium">
                <span className="text-neon-cyan font-bold">4.8/5</span> by
                20,000+ top performers
              </p>
            </div>
          </div>
        }
      >
        {/* Hero Image Inside Scroll Card */}
        <Image
          src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=3840&auto=format&fit=crop"
          alt="AI Mock Interview Studio Interface"
          height={720}
          width={1400}
          className="mx-auto rounded-2xl object-cover h-full object-left-top"
          draggable={false}
          priority
        />
      </ContainerScroll>
    </section>
  );
}
