"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Download,
  HeartPulse,
  MessageCircle,
  Pill,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Utensils,
} from "lucide-react";

const APK_URL = "/downloads/inutriguide.apk";

const productStats = [
  ["Personal", "nutrition plan"],
  ["Smart", "supplement checks"],
  ["Daily", "progress tracking"],
];

const featureCards = [
  { icon: Brain, title: "Personal health profile", text: "Build guidance around goals, health context, symptoms, habits, and nutrition preferences." },
  { icon: Sparkles, title: "Explainable recommendations", text: "Show clear reasons behind nutrition and supplement suggestions, not black-box answers." },
  { icon: Pill, title: "Supplement inventory", text: "Track what users take, compare nutrients, and keep routines organized over time." },
  { icon: ShieldCheck, title: "Safety warnings", text: "Surface interaction cautions and personalized warning signals before decisions are made." },
  { icon: MessageCircle, title: "AI nutrition chat", text: "Ask follow-up questions and keep conversations connected to the user’s health context." },
  { icon: Activity, title: "Daily habit tracking", text: "Monitor supplements, nutrition habits, symptoms, energy, and consistency in one place." },
  { icon: TrendingUp, title: "Nutrient statistics", text: "Turn daily activity into readable progress signals, trends, and nutrition insights." },
  { icon: HeartPulse, title: "Wellness feedback loop", text: "Use profile changes and feedback to improve future recommendations and routines." },
];

const timeline = [
  ["Profile", "Tell the app what matters: health context, goals, and routine."],
  ["Guidance", "Receive personalized nutrition and supplement recommendations."],
  ["Check", "Review warnings, reasons, and nutrient coverage before acting."],
  ["Track", "Log progress and keep improving the plan day by day."],
];

const bars = [
  ["Energy", "82%"],
  ["Consistency", "74%"],
  ["Nutrient coverage", "68%"],
  ["Supplement safety", "91%"],
];

const screenshots = [
  ["/screens/recommendations.png", "Recommendations"],
  ["/screens/chat.png", "AI chat"],
  ["/screens/profile.png", "Health profile"],
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 80, damping: 15 } },
};

export default function Home() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <main>
      <section className="hero" id="top">
        <motion.div style={{ y: heroY, opacity: heroOpacity, position: 'absolute', inset: 0 }}>
            <Image className="heroBackground" src="/screens/home-dashboard.png" alt="" fill priority sizes="100vw" />
            <div className="heroOverlay" />
        </motion.div>

        <nav className="nav" aria-label="Primary navigation">
          <motion.a 
            className="brand" href="#top" aria-label="I-NutriGuide home"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.span 
              className="brandMark"
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.4 }}
            >I</motion.span>
            <span>I-NutriGuide</span>
          </motion.a>
          <motion.div 
            className="navLinks"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
          >
            {["Features", "Insights", "Download"].map((link) => (
              <motion.a 
                key={link} href={`#${link.toLowerCase()}`}
                whileHover={{ scale: 1.05, color: "var(--mint)" }}
                whileTap={{ scale: 0.95 }}
              >{link}</motion.a>
            ))}
          </motion.div>
        </nav>

        <div className="heroInner">
          <motion.div className="heroCopy" variants={staggerContainer} initial="hidden" animate="show">
            <motion.p className="eyebrow" variants={fadeUpItem}>Nutrition companion for real routines</motion.p>
            <motion.h1 variants={fadeUpItem}>I-NutriGuide</motion.h1>
            <motion.p className="lede" variants={fadeUpItem}>
              Personalized nutrition guidance, supplement safety, daily tracking, and AI support in one calm mobile experience.
            </motion.p>
            <motion.div className="heroActions" variants={fadeUpItem}>
              <motion.a 
                className="primaryButton" href={APK_URL} download
                whileHover={{ scale: 1.03, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" }}
                whileTap={{ scale: 0.97 }}
              >
                <Download size={20} />
                Download APK
              </motion.a>
              <motion.a 
                className="secondaryButton" href="#features"
                whileHover={{ x: 5, color: "var(--mint)" }}
              >
                Explore
                <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}><ArrowRight size={18} /></motion.div>
              </motion.a>
            </motion.div>
            <motion.div className="statRow" aria-label="Product highlights" variants={fadeUpItem}>
              {productStats.map(([label, value]) => (
                <motion.div 
                  className="stat" key={label} 
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <strong>{label}</strong>
                  <span>{value}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div className="heroDeviceStack" initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.3, type: "spring", stiffness: 50 }}>
            <motion.div className="floatingChip chipOne" animate={{ y: [0, -15, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }} whileHover={{ scale: 1.1 }}>
              <ShieldCheck size={18} />
              Safe choice
            </motion.div>
            <motion.div className="heroPhone mainPhone" animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <Image src="/screens/recommendations.png" alt="I-NutriGuide recommendations screen" width={390} height={844} priority />
            </motion.div>
            <motion.div className="heroPhone sidePhone" animate={{ y: [0, 16, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
              <Image src="/screens/chat.png" alt="I-NutriGuide AI chat screen" width={390} height={844} />
            </motion.div>
            <motion.div className="floatingChip chipTwo" animate={{ y: [0, 12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} whileHover={{ scale: 1.1 }}>
              <Bot size={18} />
              Ask anytime
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="section introBand">
        <motion.div className="sectionHeader" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={staggerContainer}>
          <motion.p className="eyebrow" variants={fadeUpItem}>Built around the person</motion.p>
          <motion.h2 variants={fadeUpItem}>From profile to plan, every screen has a job.</motion.h2>
          <motion.p variants={fadeUpItem}>
            I-NutriGuide helps users understand what to do, why it matters, and how their routine is changing over time.
          </motion.p>
        </motion.div>
        
        <div className="screenRail">
          {screenshots.map(([src, label], index) => (
            <motion.div
              className="phoneFrame"
              key={src}
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              whileInView={{ opacity: 1, y: index === 1 ? -24 : 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={{ y: index === 1 ? -32 : -8, scale: 1.02 }}
              transition={{ duration: 0.8, delay: index * 0.15, type: "spring" }}
            >
              <Image src={src} alt={`I-NutriGuide ${label} screen`} width={390} height={844} />
              <motion.span whileHover={{ scale: 1.1 }}>{label}</motion.span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section featureSection" id="features">
        <motion.div className="sectionHeader compact" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={staggerContainer}>
          <motion.p className="eyebrow" variants={fadeUpItem}>Core features</motion.p>
          <motion.h2 variants={fadeUpItem}>Everything a nutrition companion should remember.</motion.h2>
        </motion.div>
        
        <motion.div 
          className="featureGrid"
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {featureCards.map((feature) => (
            <motion.article
              className="featureCard"
              key={feature.title}
              variants={fadeUpItem}
              whileHover={{ 
                y: -10, 
                scale: 1.03,
                boxShadow: "0 20px 40px rgba(0,0,0,0.06)",
                borderColor: "var(--mint)"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div 
                whileHover={{ rotate: [0, -10, 10, -5, 5, 0] }} 
                transition={{ duration: 0.5 }}
                style={{ display: "inline-block", color: "var(--teal)" }}
              >
                <feature.icon size={28} />
              </motion.div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="insightBand" id="insights">
        <div className="section insightGrid">
          <motion.div className="sectionHeader" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={staggerContainer}>
            <motion.p className="eyebrow" variants={fadeUpItem}>Readable insight</motion.p>
            <motion.h2 variants={fadeUpItem}>Progress feels easier when the signals are clear.</motion.h2>
            <motion.p variants={fadeUpItem}>
              The app turns routine check-ins into useful feedback: progress, coverage, safety, and next best actions.
            </motion.p>
          </motion.div>

          <motion.div 
            className="graphPanel" 
            initial={{ opacity: 0, scale: 0.9, x: 40 }} 
            whileInView={{ opacity: 1, scale: 1, x: 0 }} 
            viewport={{ once: true, amount: 0.3 }} 
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            whileHover={{ boxShadow: "0 24px 48px rgba(0,0,0,0.08)" }}
          >
            <div className="ringWrap">
              <motion.div 
                className="progressRing"
                initial={{ rotate: -90, opacity: 0 }}
                whileInView={{ rotate: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, type: "spring" }}
              >
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >84%</motion.span>
              </motion.div>
              <p>Weekly plan momentum</p>
            </div>
            <div className="barList">
              {bars.map(([label, value], index) => (
                <div className="barItem" key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <motion.i 
                    style={{ "--value": value } as CSSProperties}
                    initial={{ width: 0 }}
                    whileInView={{ width: value }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 + (index * 0.15), type: "spring" }}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section journeySection">
        <motion.div className="sectionHeader compact" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={staggerContainer}>
          <motion.p className="eyebrow" variants={fadeUpItem}>How it works</motion.p>
          <motion.h2 variants={fadeUpItem}>A simple loop users can keep following.</motion.h2>
        </motion.div>
        
        <motion.div 
          className="journeyGrid"
          initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
          variants={{ show: { transition: { staggerChildren: 0.15 } } }}
        >
          {timeline.map(([title, text], index) => (
            <motion.article
              className="journeyCard"
              key={title}
              variants={fadeUpItem}
              whileHover={{ scale: 1.05, backgroundColor: "var(--surface)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.span 
                initial={{ scale: 0, rotate: -45 }}
                whileInView={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
                viewport={{ once: true }}
              >{index + 1}</motion.span>
              <h3>{title}</h3>
              <p>{text}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="downloadBand" id="download">
        <motion.div 
          initial={{ opacity: 0, y: 40 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        >
          <p className="eyebrow">Android APK</p>
          <h2>Install I-NutriGuide on Android.</h2>
          <p>Download the latest production build and start exploring personalized nutrition guidance from your phone.</p>
        </motion.div>
        <motion.a 
          className="primaryButton dark" href={APK_URL} download
          whileHover={{ scale: 1.05, y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.3)" }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <Download size={20} />
          Download APK
        </motion.a>
      </section>

      <section className="section assurance">
        {["Personalized recommendations", "Supplement safety checks", "Daily nutrition tracking"].map((item, index) => (
          <motion.div 
            className="assuranceItem" key={item}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, color: "var(--teal)" }}
          >
            <CheckCircle2 size={22} />
            <span>{item}</span>
          </motion.div>
        ))}
        <motion.div 
          className="assuranceItem"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05, color: "var(--teal)" }}
        >
          <Utensils size={22} />
          <span>Designed for everyday food, supplement, and wellness decisions</span>
        </motion.div>
      </section>
    </main>
  );
}
