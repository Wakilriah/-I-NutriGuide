import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://landing.matchcesoir.pro"),
  title: "I-NutriGuide | Personalized Nutrition and Supplement Safety",
  description:
    "Personalized nutrition guidance, supplement tracking, food and nutrient insight, and safety-aware recommendations for Android.",
  keywords: [
    "nutrition app",
    "supplement safety",
    "food tracking",
    "nutrient recommendations",
    "Android nutrition app",
    "I-NutriGuide",
  ],
  openGraph: {
    title: "I-NutriGuide",
    description:
      "Personalized nutrition guidance, supplement safety checks, daily tracking, and AI support.",
    type: "website",
    images: ["/screens/home-dashboard.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
