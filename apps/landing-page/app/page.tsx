"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { motion } from "motion/react";
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
  {
    icon: Brain,
    title: "Personal health profile",
    text: "Build guidance around goals, health context, symptoms, habits, and nutrition preferences.",
  },
  {
    icon: Sparkles,
    title: "Explainable recommendations",
    text: "Show clear reasons behind nutrition and supplement suggestions, not black-box answers.",
  },
  {
    icon: Pill,
    title: "Supplement inventory",
    text: "Track what users take, compare nutrients, and keep routines organized over time.",
  },
  {
    icon: ShieldCheck,
    title: "Safety warnings",
    text: "Surface interaction cautions and personalized warning signals before decisions are made.",
  },
  {
    icon: MessageCircle,
    title: "AI nutrition chat",
    text: "Ask follow-up questions and keep conversations connected to the user’s health context.",
  },
  {
    icon: Activity,
    title: "Daily habit tracking",
    text: "Monitor supplements, nutrition habits, symptoms, energy, and consistency in one place.",
  },
  {
    icon: TrendingUp,
    title: "Nutrient statistics",
    text: "Turn daily activity into readable progress signals, trends, and nutrition insights.",
  },
  {
    icon: HeartPulse,
    title: "Wellness feedback loop",
    text: "Use profile changes and feedback to improve future recommendations and routines.",
  },
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

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <Image className="heroBackground" src="/screens/home-dashboard.png" alt="" fill priority sizes="100vw" />
        <div className="heroOverlay" />

        <nav className="nav" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="I-NutriGuide home">
            <span className="brandMark">I</span>
            <span>I-NutriGuide</span>
          </a>
          <div className="navLinks">
            <a href="#features">Features</a>
            <a href="#insights">Insights</a>
            <a href="#download">Download</a>
          </div>
        </nav>

        <div className="heroInner">
          <motion.div className="heroCopy" initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.75, ease: "easeOut" }}>
            <p className="eyebrow">Nutrition companion for real routines</p>
            <h1>I-NutriGuide</h1>
            <p className="lede">
              Personalized nutrition guidance, supplement safety, daily tracking, and AI support in one calm mobile experience.
            </p>
            <div className="heroActions">
              <a className="primaryButton" href={APK_URL} download>
                <Download size={20} />
                Download APK
              </a>
              <a className="secondaryButton" href="#features">
                Explore
                <ArrowRight size={18} />
              </a>
            </div>
            <div className="statRow" aria-label="Product highlights">
              {productStats.map(([label, value]) => (
                <motion.div className="stat" key={label} whileHover={{ y: -4 }}>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div className="heroDeviceStack" initial={{ opacity: 0, x: 42 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.15 }}>
            <motion.div className="floatingChip chipOne" animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              <ShieldCheck size={18} />
              Safe choice
            </motion.div>
            <motion.div className="heroPhone mainPhone" animate={{ y: [0, -10, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}>
              <Image src="/screens/recommendations.png" alt="I-NutriGuide recommendations screen" width={390} height={844} priority />
            </motion.div>
            <motion.div className="heroPhone sidePhone" animate={{ y: [0, 14, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
              <Image src="/screens/chat.png" alt="I-NutriGuide AI chat screen" width={390} height={844} />
            </motion.div>
            <motion.div className="floatingChip chipTwo" animate={{ y: [0, 10, 0] }} transition={{ duration: 4.7, repeat: Infinity, ease: "easeInOut" }}>
              <Bot size={18} />
              Ask anytime
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="section introBand">
        <motion.div className="sectionHeader" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fadeUp}>
          <p className="eyebrow">Built around the person</p>
          <h2>From profile to plan, every screen has a job.</h2>
          <p>
            I-NutriGuide helps users understand what to do, why it matters, and how their routine is changing over time.
          </p>
        </motion.div>
        <div className="screenRail">
          {screenshots.map(([src, label], index) => (
            <motion.div
              className="phoneFrame"
              key={src}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: index === 1 ? -18 : 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.65, delay: index * 0.12 }}
            >
              <Image src={src} alt={`I-NutriGuide ${label} screen`} width={390} height={844} />
              <span>{label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section featureSection" id="features">
        <motion.div className="sectionHeader compact" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fadeUp}>
          <p className="eyebrow">Core features</p>
          <h2>Everything a nutrition companion should remember.</h2>
        </motion.div>
        <div className="featureGrid">
          {featureCards.map((feature, index) => (
            <motion.article
              className="featureCard"
              key={feature.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: (index % 4) * 0.08 }}
              whileHover={{ y: -6 }}
            >
              <feature.icon size={24} />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="insightBand" id="insights">
        <div className="section insightGrid">
          <motion.div className="sectionHeader" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.35 }} variants={fadeUp}>
            <p className="eyebrow">Readable insight</p>
            <h2>Progress feels easier when the signals are clear.</h2>
            <p>
              The app turns routine check-ins into useful feedback: progress, coverage, safety, and next best actions.
            </p>
          </motion.div>

          <motion.div className="graphPanel" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
            <div className="ringWrap">
              <div className="progressRing">
                <span>84%</span>
              </div>
              <p>Weekly plan momentum</p>
            </div>
            <div className="barList">
              {bars.map(([label, value], index) => (
                <div className="barItem" key={label}>
                  <div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <i style={{ "--value": value } as CSSProperties} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section journeySection">
        <div className="sectionHeader compact">
          <p className="eyebrow">How it works</p>
          <h2>A simple loop users can keep following.</h2>
        </div>
        <div className="journeyGrid">
          {timeline.map(([title, text], index) => (
            <motion.article
              className="journeyCard"
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <span>{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="downloadBand" id="download">
        <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <p className="eyebrow">Android APK</p>
          <h2>Install I-NutriGuide on Android.</h2>
          <p>Download the latest production build and start exploring personalized nutrition guidance from your phone.</p>
        </motion.div>
        <a className="primaryButton dark" href={APK_URL} download>
          <Download size={20} />
          Download APK
        </a>
      </section>

      <section className="section assurance">
        {["Personalized recommendations", "Supplement safety checks", "Daily nutrition tracking"].map((item) => (
          <div className="assuranceItem" key={item}>
            <CheckCircle2 size={22} />
            <span>{item}</span>
          </div>
        ))}
        <div className="assuranceItem">
          <Utensils size={22} />
          <span>Designed for everyday food, supplement, and wellness decisions</span>
        </div>
      </section>
    </main>
  );
}
