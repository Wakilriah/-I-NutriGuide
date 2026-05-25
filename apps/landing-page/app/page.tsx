"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bot,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  FileHeart,
  LineChart,
  MessageCircle,
  Pill,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Utensils,
} from "lucide-react";

const APK_URL = "/downloads/inutriguide.apk";

const heroStats = [
  ["3,223", "food records"],
  ["106", "supplements"],
  ["150", "safety rules"],
];

const dataStats = [
  { value: "3,223", label: "foods", detail: "CIQUAL, USDA, and Open Food Facts records" },
  { value: "84", label: "nutrients", detail: "vitamins, minerals, fatty acids, and compounds" },
  { value: "106", label: "supplements", detail: "canonical ingredient-level supplement entities" },
  { value: "492", label: "aliases", detail: "search terms like D3, fish oil, curcumin, CoQ10" },
  { value: "150", label: "safety rules", detail: "interaction, upper-limit, and condition cautions" },
  { value: "69", label: "intake refs", detail: "adult RDA, AI, DV, and upper-limit records" },
];

const featureCards = [
  {
    icon: Brain,
    title: "Profile-based guidance",
    text: "Recommendations account for goals, diet style, allergies, disliked foods, routine, and health context.",
  },
  {
    icon: Pill,
    title: "Supplement intelligence",
    text: "Track supplements, normalize common names, and connect routines to nutrients and safety checks.",
  },
  {
    icon: ShieldCheck,
    title: "Safety before suggestions",
    text: "Warnings surface before decisions, including upper-limit, absorption, medication, and condition cautions.",
  },
  {
    icon: MessageCircle,
    title: "Context-aware AI chat",
    text: "Users can ask follow-up questions without starting from zero every time.",
  },
  {
    icon: Utensils,
    title: "Food and nutrient search",
    text: "The app works with thousands of food records and nutrient links for everyday planning.",
  },
  {
    icon: Activity,
    title: "Daily tracking",
    text: "Food entries, supplement routines, symptoms, energy, and consistency stay connected over time.",
  },
  {
    icon: LineChart,
    title: "Readable progress",
    text: "Coverage, consistency, and safety signals are presented as simple next actions.",
  },
  {
    icon: Sparkles,
    title: "Explainable results",
    text: "Recommendations include reasons, warnings, and supporting signals instead of opaque scores.",
  },
];

const workflow = [
  {
    icon: ClipboardCheck,
    title: "Build profile",
    text: "Capture diet style, goals, allergies, disliked foods, and supplement routine.",
  },
  {
    icon: Search,
    title: "Find gaps",
    text: "Compare food habits and supplements against nutrient coverage and intake references.",
  },
  {
    icon: AlertTriangle,
    title: "Check risk",
    text: "Flag supplement conflicts, upper limits, absorption issues, and medication cautions.",
  },
  {
    icon: LineChart,
    title: "Track change",
    text: "Turn daily activity into trend signals that refine future guidance.",
  },
];

const sourcePillars = [
  ["NIH ODS", "vitamin, mineral, and supplement fact-sheet backbone"],
  ["NCCIH", "botanical and herb safety context"],
  ["MedlinePlus", "consumer-readable supplement and medication cautions"],
];

const faqs = [
  {
    question: "Is I-NutriGuide medical advice?",
    answer:
      "No. It is built for nutrition education, supplement awareness, and routine organization. Medication use, pregnancy, chronic conditions, and severe symptoms should be reviewed with a qualified clinician.",
  },
  {
    question: "Where does the data come from?",
    answer:
      "The current knowledge base combines food and nutrient data with supplement references from sources such as NIH ODS, NCCIH, MedlinePlus, CIQUAL, USDA, and Open Food Facts.",
  },
  {
    question: "Can I use it if I take medication?",
    answer:
      "The app can surface supplement safety cautions, but it should not replace a pharmacist or clinician. Users taking medication should verify supplement routines with a professional.",
  },
  {
    question: "Why is the download an APK?",
    answer:
      "The current release is an Android test build distributed directly as an APK while the product is still being validated.",
  },
  {
    question: "What does the AI chat use?",
    answer:
      "The chat experience is designed to work with the user profile, food preferences, supplement routine, and tracking context so answers are more relevant than generic nutrition advice.",
  },
];

const bars = [
  ["Nutrient coverage", "68%"],
  ["Supplement safety", "91%"],
  ["Routine consistency", "74%"],
  ["Profile completeness", "86%"],
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
      staggerChildren: 0.09,
      delayChildren: 0.08,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 92, damping: 18 },
  },
};

export default function Home() {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0.25]);
  const floatTransition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 6, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <main>
      <section className="hero" id="top">
        <motion.div
          className="heroMedia"
          style={{
            y: shouldReduceMotion ? 0 : heroY,
            opacity: shouldReduceMotion ? 1 : heroOpacity,
          }}
        >
          <Image
            className="heroBackground"
            src="/hero-nutrition-intelligence.webp"
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <div className="heroOverlay" />
        </motion.div>

        <nav className="nav" aria-label="Primary navigation">
          <motion.a
            className="brand"
            href="#top"
            aria-label="I-NutriGuide home"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <motion.span
              className="brandMark"
              whileHover={shouldReduceMotion ? undefined : { rotate: 90, scale: 1.06 }}
              transition={{ duration: 0.28 }}
            >
              I
            </motion.span>
            <span>I-NutriGuide</span>
          </motion.a>

          <motion.div
            className="navLinks"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            {["Data", "Features", "Safety", "Download"].map((link) => (
              <motion.a
                key={link}
                href={`#${link.toLowerCase()}`}
                whileHover={shouldReduceMotion ? undefined : { y: -2, color: "var(--mint)" }}
                whileTap={{ scale: 0.98 }}
              >
                {link}
              </motion.a>
            ))}
          </motion.div>
        </nav>

        <div className="heroInner">
          <motion.div className="heroCopy" variants={staggerContainer} initial="hidden" animate="show">
            <motion.p className="eyebrow" variants={fadeUpItem}>
              Nutrition and supplement guidance
            </motion.p>
            <motion.h1 variants={fadeUpItem}>
              Personalized nutrition decisions with safety built in.
            </motion.h1>
            <motion.p className="lede" variants={fadeUpItem}>
              I-NutriGuide helps users understand what to eat, what their supplements add, and when a routine needs a safety check.
            </motion.p>

            <motion.div className="heroActions" variants={fadeUpItem}>
              <motion.a
                className="primaryButton"
                href={APK_URL}
                download
                whileHover={shouldReduceMotion ? undefined : { y: -4, boxShadow: "0 18px 34px rgba(0,0,0,0.22)" }}
                whileTap={{ scale: 0.98 }}
              >
                <Download size={20} />
                Download Android APK
              </motion.a>
              <motion.a
                className="secondaryButton"
                href="#data"
                whileHover={shouldReduceMotion ? undefined : { x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                View data coverage
                <ArrowRight size={18} />
              </motion.a>
            </motion.div>

            <motion.div className="statRow" aria-label="Current product data coverage" variants={fadeUpItem}>
              {heroStats.map(([value, label]) => (
                <motion.div
                  className="stat"
                  key={label}
                  whileHover={shouldReduceMotion ? undefined : { y: -5 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <strong>{value}</strong>
                  <span>{label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="heroDeviceStack"
            initial={{ opacity: 0, x: 56 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 58, damping: 18 }}
          >
            <motion.div
              className="floatingChip chipOne"
              animate={shouldReduceMotion ? undefined : { y: [0, -12, 0] }}
              transition={{ ...floatTransition, duration: 5.4 }}
            >
              <ShieldCheck size={18} />
              Safety check
            </motion.div>
            <motion.div
              className="heroPhone mainPhone"
              animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
              transition={floatTransition}
            >
              <Image
                src="/screens/recommendations.png"
                alt="I-NutriGuide recommendation screen"
                width={390}
                height={844}
                priority
              />
            </motion.div>
            <motion.div
              className="heroPhone sidePhone"
              animate={shouldReduceMotion ? undefined : { y: [0, 14, 0] }}
              transition={{ ...floatTransition, duration: 7, delay: 0.25 }}
            >
              <Image src="/screens/chat.png" alt="I-NutriGuide AI chat screen" width={390} height={844} />
            </motion.div>
            <motion.div
              className="floatingChip chipTwo"
              animate={shouldReduceMotion ? undefined : { y: [0, 10, 0] }}
              transition={{ ...floatTransition, duration: 5.8, delay: 0.4 }}
            >
              <Bot size={18} />
              Ask with context
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="section dataSection" id="data">
        <motion.div
          className="sectionHeader wide"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.32 }}
          variants={staggerContainer}
        >
          <motion.p className="eyebrow" variants={fadeUpItem}>
            Structured knowledge base
          </motion.p>
          <motion.h2 variants={fadeUpItem}>Built on food, nutrient, supplement, and safety data.</motion.h2>
          <motion.p variants={fadeUpItem}>
            The landing page now reflects the app database: food coverage is established, while supplement intelligence is expanding through trusted public sources.
          </motion.p>
        </motion.div>

        <motion.div
          className="dataGrid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.16 }}
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          {dataStats.map((item) => (
            <motion.article
              className="dataCard"
              key={item.label}
              variants={fadeUpItem}
              whileHover={shouldReduceMotion ? undefined : { y: -6, borderColor: "var(--teal)" }}
            >
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <p>{item.detail}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.div
          className="sourceStrip"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={staggerContainer}
        >
          <motion.div className="sourceLead" variants={fadeUpItem}>
            <Database size={24} />
            <span>Source-backed expansion</span>
          </motion.div>
          {sourcePillars.map(([name, detail]) => (
            <motion.div className="sourceItem" key={name} variants={fadeUpItem}>
              <BadgeCheck size={18} />
              <div>
                <strong>{name}</strong>
                <span>{detail}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="section introBand">
        <motion.div
          className="sectionHeader"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={staggerContainer}
        >
          <motion.p className="eyebrow" variants={fadeUpItem}>
            Built around the user
          </motion.p>
          <motion.h2 variants={fadeUpItem}>Every screen supports one decision loop.</motion.h2>
          <motion.p variants={fadeUpItem}>
            Users can move from profile context to recommendations, from warnings to daily tracking, then back into better guidance.
          </motion.p>
        </motion.div>

        <div className="screenRail">
          {screenshots.map(([src, label], index) => (
            <motion.div
              className="phoneFrame"
              key={src}
              initial={{ opacity: 0, y: 46, scale: 0.96 }}
              whileInView={{ opacity: 1, y: index === 1 ? -22 : 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              whileHover={shouldReduceMotion ? undefined : { y: index === 1 ? -30 : -8, scale: 1.015 }}
              transition={{ duration: 0.72, delay: index * 0.12, type: "spring", stiffness: 76, damping: 16 }}
            >
              <Image src={src} alt={`I-NutriGuide ${label} screen`} width={390} height={844} />
              <span>{label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section featureSection" id="features">
        <motion.div
          className="sectionHeader compact"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={staggerContainer}
        >
          <motion.p className="eyebrow" variants={fadeUpItem}>
            Product capabilities
          </motion.p>
          <motion.h2 variants={fadeUpItem}>Specific tools for food, supplements, and progress.</motion.h2>
        </motion.div>

        <motion.div
          className="featureGrid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        >
          {featureCards.map((feature) => (
            <motion.article
              className="featureCard"
              key={feature.title}
              variants={fadeUpItem}
              whileHover={shouldReduceMotion ? undefined : { y: -8, borderColor: "var(--mint)" }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <feature.icon size={28} />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="insightBand" id="insights">
        <div className="section insightGrid">
          <motion.div
            className="sectionHeader"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={staggerContainer}
          >
            <motion.p className="eyebrow" variants={fadeUpItem}>
              Readable insight
            </motion.p>
            <motion.h2 variants={fadeUpItem}>Progress is easier when the signals are clear.</motion.h2>
            <motion.p variants={fadeUpItem}>
              I-NutriGuide turns daily check-ins into coverage, safety, consistency, and next-action signals.
            </motion.p>
          </motion.div>

          <motion.div
            className="graphPanel"
            initial={{ opacity: 0, scale: 0.94, x: 34 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 66, damping: 16 }}
          >
            <div className="ringWrap">
              <motion.div
                className="progressRing"
                initial={{ rotate: -70, opacity: 0 }}
                whileInView={{ rotate: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, type: "spring", stiffness: 72, damping: 18 }}
              >
                <span>84%</span>
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
                    transition={{ duration: 0.8, delay: 0.1 + index * 0.1, type: "spring" }}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="section workflowSection">
        <motion.div
          className="sectionHeader compact"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={staggerContainer}
        >
          <motion.p className="eyebrow" variants={fadeUpItem}>
            How it works
          </motion.p>
          <motion.h2 variants={fadeUpItem}>A practical loop users can repeat.</motion.h2>
        </motion.div>

        <motion.div
          className="workflowGrid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {workflow.map((step, index) => (
            <motion.article
              className="workflowCard"
              key={step.title}
              variants={fadeUpItem}
              whileHover={shouldReduceMotion ? undefined : { y: -6 }}
            >
              <div className="stepTop">
                <step.icon size={24} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="safetyBand" id="safety">
        <div className="section safetyGrid">
          <motion.div
            className="sectionHeader"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={staggerContainer}
          >
            <motion.p className="eyebrow" variants={fadeUpItem}>
              Safety positioning
            </motion.p>
            <motion.h2 variants={fadeUpItem}>Guidance should be useful without pretending to be a doctor.</motion.h2>
            <motion.p variants={fadeUpItem}>
              The app is designed for nutrition education, routine organization, and supplement awareness. Medication use, pregnancy, chronic conditions, and severe symptoms need qualified clinical advice.
            </motion.p>
          </motion.div>

          <motion.div
            className="safetyPanel"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ type: "spring", stiffness: 78, damping: 18 }}
          >
            <FileHeart size={28} />
            <h3>Clear boundaries</h3>
            <p>
              I-NutriGuide provides informational support only. It does not diagnose, treat, cure, or replace medical care.
            </p>
            <ul>
              <li>Review supplements with a clinician when taking medication.</li>
              <li>Use caution with pregnancy, breastfeeding, kidney, liver, thyroid, or heart conditions.</li>
              <li>Stop and seek care for severe or unexpected symptoms.</li>
            </ul>
          </motion.div>
        </div>
      </section>

      <section className="section faqSection" id="faq">
        <motion.div
          className="sectionHeader compact"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          variants={staggerContainer}
        >
          <motion.p className="eyebrow" variants={fadeUpItem}>
            Common questions
          </motion.p>
          <motion.h2 variants={fadeUpItem}>Clear answers before users install.</motion.h2>
        </motion.div>

        <motion.div
          className="faqGrid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.18 }}
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        >
          {faqs.map((faq) => (
            <motion.article
              className="faqItem"
              key={faq.question}
              variants={fadeUpItem}
              whileHover={shouldReduceMotion ? undefined : { y: -5, borderColor: "var(--teal)" }}
            >
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="downloadBand" id="download">
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 58, damping: 16 }}
        >
          <p className="eyebrow">Android APK</p>
          <h2>Install the latest I-NutriGuide build.</h2>
          <p>Direct APK download for Android testing. Open this page on your phone or transfer the file after download.</p>
        </motion.div>
        <motion.a
          className="primaryButton dark downloadButton"
          href={APK_URL}
          download
          whileHover={shouldReduceMotion ? undefined : { y: -5, boxShadow: "0 14px 26px rgba(20,33,29,0.28)" }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12, type: "spring", stiffness: 90, damping: 16 }}
        >
          <Smartphone size={20} />
          Download APK
        </motion.a>
      </section>

      <section className="section assurance">
        {["Personalized recommendations", "Supplement safety checks", "Daily nutrition tracking"].map((item, index) => (
          <motion.div
            className="assuranceItem"
            key={item}
            initial={{ opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            whileHover={shouldReduceMotion ? undefined : { y: -3, color: "var(--teal)" }}
          >
            <CheckCircle2 size={22} />
            <span>{item}</span>
          </motion.div>
        ))}
        <motion.div
          className="assuranceItem"
          initial={{ opacity: 0, x: -18 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.24 }}
          whileHover={shouldReduceMotion ? undefined : { y: -3, color: "var(--teal)" }}
        >
          <Database size={22} />
          <span>Structured food, nutrient, supplement, and safety data</span>
        </motion.div>
      </section>
    </main>
  );
}
