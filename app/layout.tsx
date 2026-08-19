import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScareSafe — Know the scares before they happen",
  description: "A spoiler-free horror companion that helps you enjoy scary movies your way.",
  icons: { icon: "/brand/ghostie-icon.png" },
  openGraph: {
    title: "ScareSafe — Know the scares before they happen",
    description: "A spoiler-free horror companion that helps you enjoy scary movies your way.",
    type: "website",
    images: [{ url: "/scaresafe-social.png", width: 1728, height: 910, alt: "Ghostie floating in the cinematic ScareSafe world" }],
  },
  twitter: { card: "summary_large_image", images: ["/scaresafe-social.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
