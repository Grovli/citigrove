import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SITE_URL, GROVLI_URL, APP_STORE_URL, INSTAGRAM_URL, ldJson } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const TITLE = "CitiGrove — Food Planning, Sparkling Beverages & Skincare";
const DESCRIPTION =
  "CitiGrove is a food-first wellness ecosystem: the Grovli food planning app, two-ingredient sparkling beverages, and natural skincare. Eat good, look good, feel good.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "CitiGrove",
  keywords: [
    "food planning",
    "food planning app",
    "Grovli",
    "AI food planning",
    "gardening",
    "hydroponics",
    "grocery savings",
    "seasonal eating",
    "sparkling beverages",
    "natural skincare",
    "healthy eating 2026",
  ],
  authors: [{ name: "CitiGrove" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "CitiGrove",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [
      { url: "/hero-bg.jpg", width: 1200, height: 630, alt: "CitiGrove" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/hero-bg.jpg"],
  },
  robots: { index: true, follow: true },
  verification: { google: "u34uo9G9I3zCh9Ai7d8lVhPdXc04zqPSJFN6tjznvOs" },
};

/** Site-wide structured data — Organization + WebSite, plus the Grovli app as
 *  a SoftwareApplication so search/AI engines connect CitiGrove → Grovli. */
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CitiGrove",
    url: SITE_URL,
    description: DESCRIPTION,
    sameAs: [INSTAGRAM_URL, GROVLI_URL],
    brand: { "@type": "Brand", name: "Grovli" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CitiGrove",
    url: SITE_URL,
    inLanguage: "en-US",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Grovli",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "iOS",
    description:
      "Grovli is an AI food planning app — personalized food plans in under 30 seconds, a smart grocery list, a pantry, an AI nutrition advisor, and The Grove for garden-to-plate planning.",
    url: GROVLI_URL,
    downloadUrl: APP_STORE_URL,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldJson(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
