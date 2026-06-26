import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import {
  SITE_URL,
  GROVLI_URL,
  APP_STORE_URL,
  INSTAGRAM_URL,
  CITIGROVE_APP_ID,
  CITIGROVE_APP_STORE_URL,
  LOGO_URL,
  ldJson,
} from "@/lib/site";

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
  // Smart App Banner — emits <meta name="apple-itunes-app"> so Safari/iOS offers
  // the CitiGrove app install from citigrove.com. Gated on a published app id
  // (empty -> omitted) so we never advertise an unpublished app.
  itunes: CITIGROVE_APP_ID
    ? { appId: CITIGROVE_APP_ID, appArgument: SITE_URL }
    : undefined,
};

/** Site-wide structured data — the brand-entity graph. CitiGrove is the parent
 *  Organization; Grovli is its subOrganization + a SoftwareApplication, with
 *  reciprocal sameAs so search/AI engines consolidate citigrove.com and
 *  grovli.citigrove.com as ONE brand across two domains (Grovli's own layout
 *  already declares parentOrganization=CitiGrove, making the link bidirectional).
 *  The CitiGrove app node appears only once the app is published (env-gated). */
const ORG_ID = `${SITE_URL}/#organization`;

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "CitiGrove",
    url: SITE_URL,
    logo: `${SITE_URL}${LOGO_URL}`,
    description: DESCRIPTION,
    sameAs: [
      INSTAGRAM_URL,
      GROVLI_URL,
      APP_STORE_URL,
      ...(CITIGROVE_APP_STORE_URL ? [CITIGROVE_APP_STORE_URL] : []),
    ],
    brand: { "@type": "Brand", name: "Grovli" },
    subOrganization: {
      "@type": "Organization",
      name: "Grovli",
      url: GROVLI_URL,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CitiGrove",
    url: SITE_URL,
    inLanguage: "en-US",
    publisher: { "@id": ORG_ID },
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
    publisher: { "@id": ORG_ID },
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  // CitiGrove app — only when published (never advertise an unpublished app).
  ...(CITIGROVE_APP_STORE_URL
    ? [
        {
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          name: "CitiGrove",
          applicationCategory: "ShoppingApplication",
          operatingSystem: "iOS",
          description:
            "The CitiGrove app — shop small-batch sparkling drinks, apparel, garden goods, and skincare, read the Journal, and find local food, wellness, and fun events near you.",
          url: SITE_URL,
          downloadUrl: CITIGROVE_APP_STORE_URL,
          publisher: { "@id": ORG_ID },
        },
      ]
    : []),
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
