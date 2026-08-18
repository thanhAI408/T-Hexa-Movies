import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "T-Hexa Movies — Xem phim nhanh, nhiều nguồn",
    template: "%s | T-Hexa Movies",
  },
  description:
    "Kho phim hợp nhất nhiều nguồn với tìm kiếm nhanh, phim chiếu rạp nổi bật và tự động chuyển máy chủ khi nguồn lỗi.",
  applicationName: "T-Hexa Movies",
  openGraph: {
    title: "T-Hexa Movies",
    description: "Một kho phim, nhiều nguồn dự phòng, trải nghiệm xem liền mạch.",
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
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
