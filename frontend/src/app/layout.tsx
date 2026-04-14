import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stacks Content Monetization",
  description: "Monetize your content on Bitcoin via Stacks",
  other: {
    "talentapp:project_verification": "1e2d03055606f33e57f007d54a3fa69bf011c0cebde57b89c2aeebcf8da3878cfc04e0df2b0af53d7bf6e8fe239dce0f98505dcec1833d4cb48e1bd2f5cfcc96",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider maxToasts={5} position="top-right">
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
