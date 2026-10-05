import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "筋トレ管理",
  description: "トレーニング・身体記録・食事・カロリー管理を1つにまとめる個人向けアプリ",
  applicationName: "筋トレ管理",
  appleWebApp: {
    capable: true,
    title: "筋トレ管理",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/192",
    apple: "/icons/180",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0b0b0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full overflow-hidden antialiased">
      <body className="h-full overflow-hidden">
        <div className="relative mx-auto h-dvh w-full max-w-[430px] bg-bg shadow-[0_0_60px_rgba(0,0,0,0.6)]">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
