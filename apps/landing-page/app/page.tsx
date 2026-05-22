import Image from "next/image";
import { Activity, ArrowRight, CheckCircle2, Download, MessageCircle, ShieldCheck, Sparkles, Utensils } from "lucide-react";

const API_URL = "https://api.matchcesoir.pro/api/v1";
const ADMIN_URL = "https://admin.matchcesoir.pro";
const APK_URL = "/downloads/inutriguide.apk";

const features = [
  {
    icon: Sparkles,
    title: "Explainable guidance",
    text: "See why each recommendation appears, with confidence, warnings, and nutrient context.",
  },
  {
    icon: Activity,
    title: "Daily tracking",
    text: "Follow progress, symptoms, supplements, and habits in one calm health workspace.",
  },
  {
    icon: MessageCircle,
    title: "Nutrition chat",
    text: "Ask questions and keep conversations connected to your profile and goals.",
  },
  {
    icon: ShieldCheck,
    title: "Safer supplement decisions",
    text: "Interaction checks and personalized cautions help reduce blind spots.",
  },
];

const stats = [
  ["Personalized", "plans"],
  ["Evidence-aware", "warnings"],
  ["Mobile-first", "tracking"],
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="heroMedia" aria-hidden="true">
          <Image src="/screens/home-dashboard.png" alt="" fill priority sizes="100vw" />
          <div className="heroShade" />
        </div>

        <nav className="nav" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="I-NutriGuide home">
            <span className="brandMark">I</span>
            <span>I-NutriGuide</span>
          </a>
          <div className="navLinks">
            <a href="#features">Features</a>
            <a href="#download">Download</a>
            <a href={ADMIN_URL}>Admin</a>
          </div>
        </nav>

        <div className="heroContent" id="top">
          <p className="eyebrow">Personal nutrition companion</p>
          <h1>I-NutriGuide</h1>
          <p className="lede">
            A focused mobile app for nutrition recommendations, supplement safety, daily tracking, and clear explanations that help users make better health decisions.
          </p>
          <div className="heroActions">
            <a className="primaryButton" href={APK_URL} download>
              <Download size={20} />
              Download APK
            </a>
            <a className="secondaryButton" href="#features">
              Explore features
              <ArrowRight size={18} />
            </a>
          </div>
          <div className="statRow" aria-label="Product highlights">
            {stats.map(([label, value]) => (
              <div className="stat" key={label}>
                <strong>{label}</strong>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section productBand">
        <div className="sectionHeader">
          <p className="eyebrow">Built for real routines</p>
          <h2>Nutrition guidance that stays understandable.</h2>
          <p>
            I-NutriGuide combines personal profile data, supplement inventory, user feedback, and interaction knowledge into an experience designed for everyday use.
          </p>
        </div>
        <div className="phoneGrid">
          <div className="phoneFrame raised">
            <Image src="/screens/recommendations.png" alt="I-NutriGuide recommendations screen" width={390} height={844} />
          </div>
          <div className="phoneFrame">
            <Image src="/screens/chat.png" alt="I-NutriGuide chat screen" width={390} height={844} />
          </div>
          <div className="phoneFrame lowered">
            <Image src="/screens/profile.png" alt="I-NutriGuide profile screen" width={390} height={844} />
          </div>
        </div>
      </section>

      <section className="section features" id="features">
        <div className="sectionHeader compact">
          <p className="eyebrow">What users get</p>
          <h2>A cleaner way to manage nutrition decisions.</h2>
        </div>
        <div className="featureGrid">
          {features.map((feature) => (
            <article className="featureCard" key={feature.title}>
              <feature.icon size={24} />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="downloadBand" id="download">
        <div>
          <p className="eyebrow">Android APK</p>
          <h2>Install the production app.</h2>
          <p>
            The APK is configured to use the production API at <strong>{API_URL}</strong>.
          </p>
        </div>
        <a className="primaryButton dark" href={APK_URL} download>
          <Download size={20} />
          Download APK
        </a>
      </section>

      <section className="section assurance">
        <div className="assuranceItem">
          <CheckCircle2 size={22} />
          <span>Backend served at api.matchcesoir.pro</span>
        </div>
        <div className="assuranceItem">
          <CheckCircle2 size={22} />
          <span>Admin tools served at admin.matchcesoir.pro</span>
        </div>
        <div className="assuranceItem">
          <Utensils size={22} />
          <span>Designed for nutrition, supplement, and daily health workflows</span>
        </div>
      </section>
    </main>
  );
}
