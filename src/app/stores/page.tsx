"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Play, Star, Clock, Film } from "lucide-react";
import { STORE_LIST } from "@/lib/stores/config";

export default function StoresPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dynamic Background - Changes based on first theme */}
      <div className="fixed inset-0">
        {/* Gradient background that can be themed */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917]">
          {/* Animated orbs */}
          <div className="absolute -top-1/4 -left-1/4 h-[900px] w-[900px] animate-pulse rounded-full bg-gradient-to-br from-[#DC2626]/20 via-[#F97316]/15 to-transparent blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[700px] w-[700px] animate-pulse rounded-full bg-gradient-to-tl from-[#FBBF24]/15 via-[#F97316]/10 to-transparent blur-3xl" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#F97316]/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="page-shell relative pt-24 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F97316]/20 bg-[#292524]/50 px-5 py-2 text-sm text-[#F97316] backdrop-blur-xl">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F97316] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F97316]" />
            </span>
            4 trải nghiệm điện ảnh đang chờ
          </div>

          {/* Title */}
          <h1 className="mt-10 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-8xl">
            <span className="bg-gradient-to-r from-[#FBBF24] via-[#F97316] to-[#DC2626] bg-clip-text text-transparent">
              KHÓM PHIM
            </span>
            <br />
            <span className="mt-4 block text-3xl font-light tracking-wider text-[#A8A29E] md:text-4xl lg:text-5xl">
              THEO THỜI GIAN
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-8 max-w-2xl text-lg text-[#A8A29E]">
            Mỗi khoảnh khắc là một trải nghiệm riêng 🌅 ☀️ 🌆 🌙
            <br />
            <span className="mt-2 block text-sm text-[#78716C]">
              Chọn "thời gian" yêu thích để bắt đầu hành trình điện ảnh
            </span>
          </p>
        </div>
      </div>

      {/* Theme Cards - Cinematic 4 Seasons */}
      <div className="page-shell relative pb-24">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STORE_LIST.map((store, index) => {
            // Theme-specific configurations
            const themeConfigs = {
              'binh-minh': {
                gradient: 'from-[#FFDAB3]/30 via-[#F5A67D]/20 to-[#E8784A]/30',
                glow: '#E8784A',
                bgDark: '#4A3728',
                bgLight: '#FFF8F5',
                accent: '#FFD166',
              },
              'ban-mai': {
                gradient: 'from-[#7DD3FC]/30 via-[#0EA5E9]/20 to-[#06B6D4]/30',
                glow: '#0EA5E9',
                bgDark: '#0F172A',
                bgLight: '#F8FAFC',
                accent: '#22C55E',
              },
              'hoang-hon': {
                gradient: 'from-[#FBBF24]/30 via-[#F97316]/20 to-[#DC2626]/30',
                glow: '#F97316',
                bgDark: '#FAFAF9',
                bgLight: '#1C1917',
                accent: '#FBBF24',
              },
              'da-nguyet': {
                gradient: 'from-[#818CF8]/30 via-[#6366F1]/20 to-[#38BDF8]/30',
                glow: '#818CF8',
                bgDark: '#F8FAFC',
                bgLight: '#030712',
                accent: '#C084FC',
              },
            };

            const config = themeConfigs[store.id as keyof typeof themeConfigs] || themeConfigs['hoang-hon'];

            return (
              <Link
                key={store.id}
                href={`/stores/${store.slug}`}
                className="group relative overflow-hidden rounded-3xl border border-white/10 backdrop-blur-xl transition-all duration-700 hover:scale-105 hover:border-white/20"
                style={{
                  background: store.theme.background,
                  boxShadow: `0 25px 50px -12px ${store.theme.shadowLg}`,
                }}
              >
                {/* Dynamic Background Gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-0 transition-opacity duration-700 group-hover:opacity-100`}
                />

                {/* Animated glow orbs */}
                <div
                  className="absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl transition-all duration-700 group-hover:scale-150"
                  style={{
                    background: config.glow,
                    opacity: 0.2,
                  }}
                />

                {/* Content */}
                <div className="relative p-8">
                  {/* Emoji icon */}
                  <div
                    className="mb-6 text-7xl transition-transform duration-500 group-hover:scale-110"
                    style={{
                      filter: `drop-shadow(0 0 20px ${config.glow}40)`,
                    }}
                  >
                    {store.theme.emoji}
                  </div>

                  {/* Theme name */}
                  <h2
                    className="text-4xl font-bold tracking-tight"
                    style={{ color: store.theme.text }}
                  >
                    {store.name}
                  </h2>

                  {/* Description */}
                  <p
                    className="mt-3 text-base leading-relaxed"
                    style={{ color: store.theme.textSecondary }}
                  >
                    {store.description}
                  </p>

                  {/* Mood tags */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {store.effects.mood.split(', ').map((mood) => (
                      <span
                        key={mood}
                        className="rounded-full px-3 py-1 text-xs font-medium capitalize"
                        style={{
                          background: `${store.theme.primary}15`,
                          color: store.theme.primary,
                        }}
                      >
                        {mood}
                      </span>
                    ))}
                  </div>

                  {/* Color preview */}
                  <div className="mt-6 flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        background: store.theme.primary,
                        boxShadow: `0 0 10px ${store.theme.primary}60`,
                      }}
                    />
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ background: store.theme.secondary }}
                    />
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ background: store.theme.accent }}
                    />
                  </div>

                  {/* CTA */}
                  <div className="mt-8 flex items-center gap-2 font-semibold transition-all group-hover:gap-4">
                    <span style={{ color: store.theme.primary }}>Khám phá</span>
                    <ArrowRight
                      className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-2"
                      style={{ color: store.theme.primary }}
                    />
                  </div>
                </div>

                {/* Decorative bottom gradient */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-32 rounded-t-full opacity-20"
                  style={{ background: store.theme.gradientAccent }}
                />
              </Link>
            );
          })}
        </div>

        {/* Bottom info */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 backdrop-blur-xl">
            <Sparkles className="h-5 w-5 text-[#FBBF24]" />
            <span className="text-[#A8A29E]">
              Tất cả đều dùng nguồn phim chất lượng cao
            </span>
            <Sparkles className="h-5 w-5 text-[#FBBF24]" />
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid gap-6 md:grid-cols-4">
          {[
            { icon: Play, title: 'Xem phim', desc: 'Chất lượng cao, nhanh chóng' },
            { icon: Star, title: 'Đánh giá', desc: 'Thông tin chi tiết từng phim' },
            { icon: Clock, title: 'Cập nhật', desc: 'Phim mới liên tục mỗi ngày' },
            { icon: Film, title: 'Đa dạng', desc: 'Phim lẻ, phim bộ, anime' },
          ].map((feature, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl transition-all duration-300 hover:bg-white/10"
            >
              <feature.icon className="mx-auto mb-3 h-8 w-8 text-[#F97316]" />
              <h3 className="font-semibold text-white">{feature.title}</h3>
              <p className="mt-1 text-sm text-[#78716C]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
