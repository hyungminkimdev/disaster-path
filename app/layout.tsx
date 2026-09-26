import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DisasterPath — Help finds you.",
  description:
    "Your next step, through every step of recovery. A human-controlled disaster recovery demo.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
