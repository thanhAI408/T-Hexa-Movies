import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { InteractiveBackground } from "@/components/effects/interactive-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

import { YoutubePlaybackProvider } from "@/components/youtube-player";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  icons: {
    icon: [{ url: "/favicon.ico?v=thexa-20260912", sizes: "16x16 32x32 48x48 64x64 256x256", type: "image/x-icon" }],
    shortcut: "/favicon.ico?v=thexa-20260912",
  },
  title: {
    default: "T-Hexa Movies — Xem phim nhanh, nhiều nguồn",
    template: "%s | T-Hexa Movies",
  },
  description:
    "Tìm và xem phim từ nhiều nguồn. Lọc theo thể loại, quốc gia, năm phát hành và chọn nguồn phát phù hợp.",
  applicationName: "T-Hexa Movies",
  openGraph: {
    title: "T-Hexa Movies",
    description: "Tìm phim, chọn nguồn và xem trực tuyến trên T-Hexa.",
    type: "website",
    locale: "vi_VN",
    siteName: "T-Hexa Movies",
  },
  twitter: {
    card: "summary_large_image",
    title: "T-Hexa Movies",
    description: "Một kho phim, nhiều nguồn dự phòng.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#07090d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className="relative min-h-screen bg-background text-foreground antialiased">
        <YoutubePlaybackProvider>
        <InteractiveBackground />
        <div className="relative z-10 flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
        </YoutubePlaybackProvider>
      </body>
    </html>
  );
}
