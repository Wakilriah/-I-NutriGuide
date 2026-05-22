import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "I-NutriGuide",
  description: "Personal nutrition guidance, supplement tracking, and explainable recommendations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
