import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { JWTAuthProvider } from "@/contexts/JWTAuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { SessionWarning } from "@/components/SessionWarning";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stacks Content Monetization",
  description: "Monetize your content on Bitcoin via Stacks",
  other: {
    "talentapp:project_verification": "1e2d03055606f33e57f007d54a3fa69bf011c0cebde57b89c2aeebcf8da3878cfc04e0df2b0af53d7bf6e8fe239dce0f98505dcec1833d4cb48e1bd2f5cfcc96",
  },
};

/**
 * Root layout component with all providers and global components
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <JWTAuthProvider>
            <ToastProvider maxToasts={5} position="top-right">
              {/* Session timeout warning component */}
              <SessionWarning 
                warningTime={5 * 60}
                timeoutTime={30 * 60}
              />
              {children}
            </ToastProvider>
          </JWTAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
