"use client";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import Image from "next/image";
import Link from "next/link";

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */

const floatingCards = [
  { label: "Software Engineering", count: "24 interviews", bg: "bg-indigo-50",  border: "border-indigo-100", text: "text-indigo-700",  rotation: "-8deg",  top: "20%", left: "3%"  },
  { label: "Product Management",   count: "18 interviews", bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-700", rotation: "6deg",   top: "14%", right: "4%" },
  { label: "Business & Finance",   count: "14 interviews", bg: "bg-amber-50",  border: "border-amber-100",  text: "text-amber-700",  rotation: "-5deg",  bottom: "34%", left: "1%" },
  { label: "Common Questions",     count: "40 interviews", bg: "bg-rose-50",   border: "border-rose-100",   text: "text-rose-700",   rotation: "8deg",   bottom: "30%", right: "2%" },
];

const trustLogos = [
  "Google", "Meta", "Amazon", "Microsoft", "Apple", "Netflix",
  "Stripe", "Shopify", "Airbnb", "OpenAI", "LinkedIn", "Uber",
];

const featureTabs = [
  {
    id: "library",
    label: "Interview Library",
    icon: "📚",
    title: "500+ Expert-Vetted Questions",
    description: "Jump straight into mock interviews with our extensive library curated by hiring managers at top companies. Pick from 'Software Engineer', 'Product Manager', 'Data Analyst', and 60+ other roles to build real confidence fast.",
    stat: "500+ questions",
  },
  {
    id: "import",
    label: "Import from Web",
    icon: "🌐",
    title: "One-Click Job-Post Import",
    description: "Use our Chrome Extension to instantly create a tailored interview from any job post online. Whether browsing LinkedIn, Indeed, or a company careers page, your custom prep is one click away.",
    stat: "Works on 1000+ sites",
  },
  {
    id: "upload",
    label: "Upload Job Post",
    icon: "📄",
    title: "AI-Analyzed Job Descriptions",
    description: "Paste a job description and our AI reads required skills and responsibilities to generate highly relevant, role-specific questions — so you practice exactly what matters.",
    stat: "< 10 sec generation",
  },
];

const features = [
  {
    icon: "🎙️",
    title: "Voice-First Interview",
    desc: "Speak naturally — just like a real interview. Our AI listens to every word via OpenAI Whisper and responds in real-time with voice, not text boxes.",
    color: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    icon: "🧠",
    title: "Adaptive Follow-ups",
    desc: "Unlike static question banks, Alex reads your actual answers and generates intelligent follow-up questions — probing deeper, just like a real interviewer would.",
    color: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: "📄",
    title: "Resume-Tailored Questions",
    desc: "Upload your PDF resume and Alex instantly tailors every question to your specific experience, tech stack, and the role you're interviewing for.",
    color: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: "📊",
    title: "Hire/No-Hire Verdict",
    desc: "Get a detailed scorecard with domain scores, strengths, improvement areas, and a real hire verdict — the same rubric actual interviewers use.",
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
];

const adaptiveSteps = [
  {
    num: "01",
    title: "You upload your resume",
    desc: "Alex reads your resume using AI and extracts your skills, experience, and tech stack to build a custom interview profile.",
    icon: "📄",
    color: "bg-indigo-500",
  },
  {
    num: "02",
    title: "Alex asks the opening question",
    desc: "Alex speaks to you via Edge TTS — a natural human-like voice — and asks a role-relevant opening question based on your background.",
    icon: "🧑‍💼",
    color: "bg-violet-500",
  },
  {
    num: "03",
    title: "You answer by speaking",
    desc: "Click the mic and respond naturally. OpenAI Whisper transcribes your speech in real-time with near-human accuracy.",
    icon: "🎙️",
    color: "bg-sky-500",
  },
  {
    num: "04",
    title: "AI adapts in real-time",
    desc: "Google Gemini analyzes your answer's content, detects gaps, and generates a dynamic follow-up — keeping the pressure exactly where it should be.",
    icon: "⚡",
    color: "bg-emerald-500",
  },
];

const techStack = [
  { name: "Google Gemini",    role: "Adaptive question generation & scoring",  icon: "✨", bg: "bg-blue-50",   border: "border-blue-100",   text: "text-blue-700" },
  { name: "OpenAI Whisper",   role: "Real-time speech-to-text transcription",   icon: "🎙️", bg: "bg-green-50",  border: "border-green-100",  text: "text-green-700" },
  { name: "Edge TTS",         role: "Natural human-like AI voice output",       icon: "🔊", bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700" },
];

const feedbackCards = [
  { label: "Content & Relevance",   desc: "See exactly what you covered well and what you missed, keeping answers sharp and on-point.",          color: "border-l-indigo-500",  tag: "97% accuracy" },
  { label: "Clarity & Speech",      desc: "Identify filler words, pacing issues, and speech habits holding back your communication.",              color: "border-l-violet-500",  tag: "Real-time" },
  { label: "Confidence & Presence", desc: "Our AI reads your hesitation patterns and helps you project authentic, interview-winning confidence.",   color: "border-l-sky-500",     tag: "AI-powered" },
];

const feedbackSteps = [
  { num: 1, title: "Strong Opening",     desc: "Start with power. Our AI identifies the key elements needed in your first 15 seconds to immediately capture interest." },
  { num: 2, title: "Maintain Flow",      desc: "Structure your answers logically. We analyze narrative flow and suggest the key details that make your story compelling." },
  { num: 3, title: "Memorable Closing",  desc: "End with confidence. Our AI crafts a closing statement that leaves a lasting positive impression on any interviewer." },
];

const testimonials = [
  { name: "Sarah K.",  role: "Software Engineer @ Google",   stars: 5, quote: "I went from bombing every FAANG interview to landing my dream job. The AI feedback was brutally honest in the best way." },
  { name: "James L.",  role: "Product Manager @ Meta",       stars: 5, quote: "The job-post import feature is a game changer. I practiced with questions tailored exactly to the Meta PM role and it showed." },
  { name: "Priya M.",  role: "Data Scientist @ Stripe",      stars: 5, quote: "I was terrified of behavioral interviews. After 2 weeks of AI practice sessions, I actually looked forward to them." },
];

const faqs = [
  { q: "What is Mock Interview Studio and how does it help me?",       a: "Mock Interview Studio simulates real job interviews using AI. You practice speaking your answers aloud, then receive instant, detailed feedback on content, speech clarity, and confidence — helping you improve with every session." },
  { q: "What types of interviews can I practice for?",                  a: "Virtually any type — behavioral, technical, case study, situational, competency-based, and more. Our library covers 500+ roles across tech, finance, marketing, healthcare, and leadership." },
  { q: "How is this different from practicing with a friend?",          a: "Our AI provides objective, unbiased, and consistent feedback every time. It analyzes metrics no friend can — filler word frequency, pacing, answer structure, keyword coverage, and confidence signals." },
  { q: "Is the AI feedback really accurate?",                           a: "Yes. Our models are trained on thousands of real interview transcripts and expert evaluations. Feedback is specific, actionable, and continuously improving." },
  { q: "Can I try it for free?",                                        a: "Absolutely. Start for free with no credit card required. Practice 3 full interviews and see your personalized feedback report before deciding on a plan." },
];

/* ─────────────────────────────────────────────────────────────
   REUSABLE ANIMATION VARIANTS
───────────────────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = (delay = 0.1) => ({
  hidden: {},
  show:   { transition: { staggerChildren: delay } },
});

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 font-semibold text-xs tracking-[0.12em] uppercase px-3.5 py-1.5 rounded-full mb-5">
      {children}
    </span>
  );
}

function FadeSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("library");
  const [openFaq, setOpenFaq]     = useState<number | null>(null);
  const activeFeature = featureTabs.find((t) => t.id === activeTab)!;

  /* Parallax for hero orbs */
  const heroRef = useRef(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const orbY = useTransform(heroScroll, [0, 1], [0, 120]);

  return (
    <div className="min-h-screen bg-surface-lowest text-on-surface overflow-x-hidden">

      {/* ══════ HERO ══════ */}
      <section ref={heroRef} className="relative pt-28 pb-0 overflow-hidden min-h-screen flex flex-col">

        {/* Soft background orbs */}
        <motion.div style={{ y: orbY }} className="orb w-[600px] h-[600px] bg-indigo-100/60 top-[-180px] left-[-200px]" />
        <motion.div style={{ y: orbY }} className="orb w-[500px] h-[500px] bg-violet-100/50 top-[-100px] right-[-180px]" />
        <motion.div style={{ y: orbY }} className="orb w-[400px] h-[300px] bg-sky-100/40   bottom-[15%] left-[30%]" />

        {/* Floating role cards */}
        {floatingCards.map((card, i) => (
          <motion.div
            key={card.label}
            className={`hidden lg:flex absolute z-10 ${card.bg} border ${card.border} rounded-2xl px-5 py-3.5 flex-col gap-1 card-shadow`}
            style={{ rotate: card.rotation, top: card.top, left: card.left, right: card.right, bottom: card.bottom } as any}
            initial={{ opacity: 0, scale: 0.75, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0   }}
            transition={{ delay: 0.5 + i * 0.15, duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <span className={`font-bold text-sm ${card.text}`}>{card.label}</span>
            <span className="text-on-surface-faint text-xs">{card.count}</span>
          </motion.div>
        ))}

        {/* Hero heading + subheading */}
        <div className="max-w-4xl mx-auto text-center px-6 relative z-20 pt-6">

          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 bg-white/80 border border-stone-200 px-5 py-2 rounded-full backdrop-blur-md mb-8 card-shadow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ duration: 0.5 }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-indigo-600 font-semibold text-sm">Adaptive AI Interview Coach</span>
            <span className="text-on-surface-faint text-sm">powered by Gemini →</span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            className="text-4xl sm:text-5xl md:text-[4.5rem] font-manrope font-extrabold tracking-tight leading-[1.08] mb-6 text-on-surface"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            The Smartest Way to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-violet-accent to-accent-deep">
              Ace Your Interview
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            className="text-on-surface-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.55 }}
          >
            Realistic AI mock interviews, personalised feedback, and in-depth performance analytics — everything you need to land your dream offer. 🚀
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3.5 justify-center mb-10"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Link
              href="/interview"
              className="bg-gradient-to-br from-accent to-violet-accent text-white px-10 py-4 rounded-full font-bold text-lg shadow-[0_6px_28px_rgba(79,70,229,0.38)] hover:scale-[1.03] active:scale-[0.97] transition-all inline-block"
            >
              👉 Try for Free
            </Link>
            <Link
              href="/interview"
              className="border border-stone-200 bg-white/80 backdrop-blur-md text-on-surface px-8 py-4 rounded-full font-semibold text-lg hover:bg-white transition-all inline-block card-shadow"
            >
              See It in Action
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="flex items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            <div className="flex -space-x-2">
              {["🧑‍💼", "👩‍💻", "👨‍🎓", "👩‍🔬", "🧑‍🏫"].map((e, i) => (
                <div key={i} className="w-9 h-9 rounded-full bg-surface-low border-2 border-white flex items-center justify-center text-sm card-shadow">
                  {e}
                </div>
              ))}
            </div>
            <p className="text-sm text-on-surface-muted">
              Rated <span className="text-accent font-bold">4.8/5</span> by <span className="font-semibold">20,000+</span> job-seekers
            </p>
          </motion.div>
        </div>

        {/* 3D scroll mockup */}
        <div className="relative -mt-8 w-full">
          <ContainerScroll titleComponent={<></>}>
            <Image
              src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=3840&auto=format&fit=crop"
              alt="Mock Interview Studio Interface"
              height={720}
              width={1400}
              className="mx-auto rounded-xl object-cover h-full object-left-top"
              draggable={false}
              priority
            />
          </ContainerScroll>
        </div>
      </section>

      {/* ══════ TRUST MARQUEE ══════ */}
      <section className="py-12 border-y border-stone-100 bg-white overflow-hidden">
        <p className="text-center text-on-surface-faint text-sm font-medium tracking-widest uppercase mb-8">
          Trusted by candidates at
        </p>
        <div className="relative flex">
          <div className="flex gap-16 animate-marquee whitespace-nowrap">
            {[...trustLogos, ...trustLogos].map((name, i) => (
              <span key={i} className="text-on-surface-muted font-semibold text-base tracking-tight opacity-50 hover:opacity-100 transition-opacity">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS — TABS ══════ */}
      <section id="features" className="py-28 px-6 max-w-6xl mx-auto">
        <FadeSection className="text-center mb-12">
          <SectionLabel>⚡ How It Works</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface mb-4">
            Start practicing in seconds
          </h2>
          <p className="text-on-surface-muted text-lg max-w-2xl mx-auto">
            Whether exploring careers or targeting a specific job, three paths to get you prepared fast.
          </p>
        </FadeSection>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {featureTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-accent text-white shadow-[0_4px_14px_rgba(79,70,229,0.35)]"
                  : "bg-white border border-stone-200 text-on-surface-muted hover:text-on-surface hover:border-stone-300 card-shadow"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{ opacity: 0,   y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-stone-100 rounded-3xl p-8 md:p-14 max-w-3xl mx-auto text-center card-shadow-lg"
          >
            <div className="text-5xl mb-6">{activeFeature.icon}</div>
            <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
              {activeFeature.stat}
            </span>
            <h3 className="text-2xl md:text-3xl font-manrope font-bold mb-4 text-on-surface">
              {activeFeature.title}
            </h3>
            <p className="text-on-surface-muted text-lg leading-relaxed">
              {activeFeature.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ══════ FEATURES GRID ══════ */}
      <section className="py-24 px-6 bg-surface-low">
        <div className="max-w-7xl mx-auto">
          <FadeSection className="text-center mb-16">
            <SectionLabel>🎯 Features</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface mb-4">
              Everything you need to succeed
            </h2>
            <p className="text-on-surface-muted text-lg max-w-2xl mx-auto">
              Designed around the way real interviews work, not generic practice tools.
            </p>
          </FadeSection>

          <motion.div
            className="grid md:grid-cols-2 gap-6"
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="bg-white border border-stone-100 rounded-2xl p-8 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 group card-shadow"
              >
                <div className={`w-14 h-14 rounded-xl ${f.color} flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-xl font-manrope font-bold mb-3 text-on-surface">{f.title}</h3>
                <p className="text-on-surface-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════ ADAPTIVE AI SECTION ══════ */}
      <section id="adaptive-ai" className="py-28 px-6 overflow-hidden relative">
        {/* Soft background wash */}
        <div className="orb w-[700px] h-[400px] bg-indigo-100/40 top-0 left-[-200px]" />
        <div className="orb w-[500px] h-[300px] bg-violet-100/30 bottom-0 right-[-150px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <FadeSection className="text-center mb-16">
            <SectionLabel>🤖 Adaptive AI</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface mb-4">
              Meet Alex — Your AI Interviewer
            </h2>
            <p className="text-on-surface-muted text-lg max-w-3xl mx-auto">
              Unlike static question banks, our AI reads your actual answers and adapts in real-time —
              asking intelligent follow-ups, probing weak spots, and keeping the pressure exactly where it needs to be.
            </p>
          </FadeSection>

          {/* Alex card + Steps side-by-side */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">

            {/* Left: Alex card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white border border-stone-100 rounded-3xl p-8 card-shadow-lg"
            >
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-7">
                <div className="relative w-16 h-16">
                  {[1, 2].map((r) => (
                    <div
                      key={r}
                      className="absolute inset-0 rounded-full border border-indigo-200/60 animate-ping"
                      style={{ transform: `scale(${1 + r * 0.25})`, animationDelay: `${r * 0.4}s`, animationDuration: "2.5s" }}
                    />
                  ))}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center text-2xl shadow-lg">
                    🧑‍💼
                  </div>
                </div>
                <div>
                  <h3 className="font-manrope font-bold text-lg text-on-surface">Alex Chen</h3>
                  <p className="text-on-surface-faint text-sm">Senior Technical Interviewer · AI</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">Active · Ready to Interview</span>
                  </div>
                </div>
              </div>

              {/* Chat bubbles */}
              <div className="space-y-3 mb-6">
                <div className="bg-stone-50 border border-stone-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <p className="text-sm text-on-surface leading-relaxed">
                    "Tell me about a time you had to debug a critical production issue under pressure. Walk me through your exact process."
                  </p>
                  <p className="text-xs text-on-surface-faint mt-1">Alex · just now</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] ml-auto">
                  <p className="text-sm text-indigo-800 leading-relaxed">
                    "Sure — at my last role, we had a memory leak hitting prod on Fridays..."
                  </p>
                  <p className="text-xs text-indigo-400 mt-1">You · speaking</p>
                </div>
                <div className="bg-stone-50 border border-stone-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <div className="flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "0s" }} />
                    <div className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
                    <span className="text-xs text-on-surface-faint ml-1">Alex is adapting follow-up...</span>
                  </div>
                </div>
              </div>

              {/* Tech stack pills */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-stone-100">
                {techStack.map((t) => (
                  <span key={t.name} className={`inline-flex items-center gap-1.5 ${t.bg} border ${t.border} ${t.text} text-xs font-semibold px-3 py-1.5 rounded-full`}>
                    {t.icon} {t.name}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right: How it adapts — numbered steps */}
            <motion.div
              className="space-y-6"
              variants={stagger(0.15)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {adaptiveSteps.map((step) => (
                <motion.div key={step.num} variants={fadeUp} className="flex gap-5 items-start">
                  <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg`}>
                    {step.num}
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{step.icon}</span>
                      <h4 className="font-manrope font-bold text-on-surface">{step.title}</h4>
                    </div>
                    <p className="text-on-surface-muted text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Tech stack row */}
          <motion.div
            className="grid md:grid-cols-3 gap-4"
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {techStack.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                className={`${t.bg} border ${t.border} rounded-2xl p-6 flex items-start gap-4`}
              >
                <div className="text-3xl">{t.icon}</div>
                <div>
                  <h4 className={`font-manrope font-bold ${t.text} mb-1`}>{t.name}</h4>
                  <p className="text-on-surface-muted text-sm leading-relaxed">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════ AI FEEDBACK ══════ */}
      <section id="feedback" className="py-28 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">

          <FadeSection className="text-center mb-16">
            <SectionLabel>🧠 AI Feedback</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface mb-4">
              Your Personal Feedback Report
            </h2>
            <p className="text-on-surface-muted text-lg max-w-3xl mx-auto">
              Multi-layered analysis that gives you a complete picture of your strengths and a clear path to improvement.
            </p>
          </FadeSection>

          {/* 3 pillars */}
          <motion.div
            className="grid md:grid-cols-3 gap-6 mb-16"
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {feedbackCards.map((card) => (
              <motion.div
                key={card.label}
                variants={fadeUp}
                className={`bg-white border border-stone-100 rounded-2xl p-7 border-l-4 ${card.color} card-shadow`}
              >
                <span className="inline-block bg-stone-50 border border-stone-100 text-on-surface-muted text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                  {card.tag}
                </span>
                <h4 className="text-lg font-manrope font-bold mb-3 text-on-surface">{card.label}</h4>
                <p className="text-on-surface-muted leading-relaxed text-sm">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Numbered steps — split layout */}
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Left: steps */}
            <motion.div
              className="space-y-8"
              variants={stagger(0.15)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {feedbackSteps.map((step) => (
                <motion.div key={step.num} variants={fadeUp} className="flex gap-5 items-start">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-[0_4px_14px_rgba(79,70,229,0.3)]">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="text-base font-manrope font-bold mb-1.5 text-on-surface">{step.title}</h4>
                    <p className="text-on-surface-muted leading-relaxed text-sm">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Right: mock feedback card */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white border border-stone-100 rounded-2xl p-7 card-shadow-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center text-white text-sm font-bold">AI</div>
                <div>
                  <p className="font-semibold text-sm text-on-surface">Performance Report</p>
                  <p className="text-xs text-on-surface-faint">Software Engineer Mock Interview</p>
                </div>
                <span className="ml-auto bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">Complete</span>
              </div>

              {/* Scores */}
              {[
                { label: "Content & Accuracy",   score: 82, color: "bg-indigo-500"  },
                { label: "Communication",          score: 76, color: "bg-violet-500" },
                { label: "Confidence",             score: 68, color: "bg-sky-500"    },
                { label: "Overall Score",          score: 79, color: "bg-emerald-500" },
              ].map((s) => (
                <div key={s.label} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-xs font-medium text-on-surface-muted mb-1.5">
                    <span>{s.label}</span>
                    <span className="text-on-surface font-bold">{s.score}%</span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${s.color} rounded-full`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-6 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <p className="text-xs font-bold text-indigo-700 mb-1">💡 Top Suggestion</p>
                <p className="text-xs text-indigo-600 leading-relaxed">
                  Reduce filler words ("um", "like") — detected 8 times. Try pausing instead. This alone can boost your score by ~12%.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════ TESTIMONIALS ══════ */}
      <section className="py-24 px-6 bg-surface-low">
        <div className="max-w-6xl mx-auto">
          <FadeSection className="text-center mb-16">
            <SectionLabel>❤️ Testimonials</SectionLabel>
            <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface mb-4">
              They got hired. You can too.
            </h2>
          </FadeSection>

          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={stagger(0.12)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="bg-white border border-stone-100 rounded-2xl p-7 flex flex-col gap-5 card-shadow hover:card-shadow-lg transition-all group"
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <span key={j} className="text-amber-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-on-surface leading-relaxed font-medium flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-on-surface">{t.name}</p>
                    <p className="text-xs text-on-surface-faint">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════ FAQ ══════ */}
      <section id="faq" className="py-28 px-6 max-w-3xl mx-auto">
        <FadeSection className="text-center mb-12">
          <SectionLabel>🤔 FAQ</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface mb-4">
            Common Questions
          </h2>
          <p className="text-on-surface-muted text-lg">
            From pricing to features — everything you need to know.
          </p>
        </FadeSection>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="bg-white border border-stone-100 rounded-2xl overflow-hidden card-shadow"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left px-6 py-5 flex items-center justify-between font-manrope font-bold text-on-surface hover:bg-stone-50 transition-colors"
              >
                {faq.q}
                <motion.span
                  animate={{ rotate: openFaq === i ? 45 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-accent text-xl ml-4 shrink-0"
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-6 text-on-surface-muted leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════ BOTTOM CTA ══════ */}
      <section className="py-20 px-6">
        <motion.div
          className="max-w-5xl mx-auto bg-gradient-to-br from-accent via-violet-accent to-accent-deep rounded-[2rem] p-12 md:p-16 text-center relative overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Decorative orbs */}
          <div className="orb w-72 h-72 bg-white/10 -top-20 -right-20" />
          <div className="orb w-72 h-72 bg-white/10 -bottom-20 -left-20" />

          <p className="relative z-10 inline-flex items-center gap-2 bg-white/20 border border-white/30 text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-8">
            🎯 Limited Time — Free Tier Available
          </p>
          <h2 className="relative z-10 text-4xl md:text-6xl font-manrope font-extrabold text-white mb-5 leading-tight">
            Ready to land that offer?
          </h2>
          <p className="relative z-10 text-lg text-white/75 mb-10 max-w-xl mx-auto">
            Join 20,000+ job-seekers who have transformed their interview performance with AI coaching.
          </p>
          <Link
            href="/interview"
            className="relative z-10 inline-block bg-white text-accent px-12 py-4 rounded-full font-bold text-lg shadow-2xl hover:scale-[1.04] active:scale-[0.97] transition-all"
          >
            Start for Free — No Credit Card
          </Link>
        </motion.div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-stone-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-accent to-violet-accent flex items-center justify-center text-xs">🎯</div>
            <span className="font-bold text-on-surface font-manrope">Mock Interview Studio</span>
          </div>
          <p className="text-on-surface-faint text-sm">© 2024 Mock Interview Studio. All rights reserved.</p>
          <div className="flex gap-7">
            {["Features", "AI Feedback", "FAQ", "Privacy"].map((l) => (
              <a key={l} href="#" className="text-on-surface-faint hover:text-on-surface transition-colors text-sm">
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* ══════ FLOATING BOTTOM PILL NAV ══════ */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 hidden md:flex">
        <motion.div
          className="bg-white/90 backdrop-blur-xl border border-stone-200 rounded-full px-2 py-2 flex items-center gap-1 card-shadow-lg"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {["Features", "Adaptive AI", "AI Feedback", "FAQ"].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(" ", "-")}`}
              className="px-4 py-2 text-sm font-medium text-on-surface-muted hover:text-on-surface hover:bg-stone-100 rounded-full transition-all"
            >
              {label}
            </a>
          ))}
          <Link
            href="/interview"
            className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-br from-accent to-violet-accent rounded-full hover:opacity-90 transition-all ml-1 shadow-[0_4px_14px_rgba(79,70,229,0.35)]"
          >
            Start Free
          </Link>
        </motion.div>
      </div>

    </div>
  );
}
