import { Metadata } from "next";
import { Manrope, Merienda } from "next/font/google";
import { cookies } from "next/headers";
import AuthProvider from "@/components/AuthProvider/AuthProvider";
import Layout from "@/components/Layout/Layout";
import TanStackProvider from "@/components/TanStackProvider/TanStackProvider";
import ToastProvider from "@/components/ToastProvider/ToastProvider";
import { SITE_NAME, SITE_URL, buildSocialMetadata } from "@/lib/metadata";
import "modern-normalize/modern-normalize.css";
import "@/styles/reset.css";
import "@/styles/base.css";
import "@/styles/container.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const merienda = Merienda({
  variable: "--font-merienda",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const TITLE = SITE_NAME;
const DESCRIPTION = "Harmoniq — mindful publishing platform for mental health and well-being";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: SITE_URL,
  ...buildSocialMetadata({ title: TITLE, description: DESCRIPTION }),
};

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  // Той самий сигнал, що вже рахує proxy.ts: чи є взагалі сенс питати бекенд
  // про сесію. Порожній для справжнього гостя, без жодного мережевого запиту.
  const hasSessionHint = Boolean(
    cookieStore.get("accessToken")?.value ||
      (cookieStore.get("refreshToken")?.value && cookieStore.get("sessionId")?.value),
  );

  return (
    <html lang="en" className={`${manrope.variable} ${merienda.variable}`}>
      <body>
        <TanStackProvider>
          <AuthProvider hasSessionHint={hasSessionHint}>
            <Layout>
              {children} {modal}
            </Layout>
          </AuthProvider>
          <ToastProvider />
        </TanStackProvider>
      </body>
    </html>
  );
}
