"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Play, Star, Clock, Film, Compass, ShieldCheck, Zap } from "lucide-react";
import { STORE_LIST } from "@/lib/stores/config";

export default function StoresPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060913] text-white">
      {/* Dynamic Background with Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] h-[700px] w-[700px] rounded-full bg-gradient-to-br from-amber-500/15 via-orange-600/10 to-transparent blur-[120px] animate-pulse-glow" />
        <div className="absolute top-[30%] -right-[15%] h-[650px] w-[650px] rounded-full bg-gradient-to-tl from-indigo-600/15 via-sky-500/10 to-transparent blur-[140px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute -bottom-[20%] left-[25%] h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-rose-600/15 via-amber-500/10 to-transparent blur-[130px] animate-pulse-glow" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Hero Header */}
      <div className="relative z-10">
        <div className="page-shell relative pt-20 pb-12 sm:pt-24 sm:pb-16 text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400 backdrop-blur-xl shadow-lg">
            <Sparkles size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
            <span>KHÁM PHÁ VŨ TRỤ ĐIỆN ẢNH T-HEXA</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08]">
            <span className="bg-gradient-to-r from-amber-200 via-orange-400 to-rose-500 bg-clip-text text-transparent">
              4 THỜI GIAN
            </span>
            <br />
            <span className="text-2xl sm:text-4xl md:text-5xl font-extralight tracking-widest text-slate-300">
              4 CẢM XÚC ĐIỆN ẢNH
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg text-slate-400 leading-relaxed">
            Mỗi khoảnh khắc trong ngày mang đến một trải nghiệm phim hoàn toàn khác biệt.
            <br />
            <span className="text-slate-500 text-xs sm:text-sm">
              Chọn thời gian và tâm trạng của bạn để bắt đầu hành trình thưởng thức phim đỉnh cao
            </span>
          </p>
        </div>
      </div>

      {/* 4 Portals Grid */}
      <div className="page-shell relative z-10 pb-24">
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STORE_LIST.map((store) => {
            const themeAccents = {
              'binh-minh': {
                glow: '#EA580C',
                halo: 'from-orange-500/25 via-amber-500/15 to-transparent',
                badgeBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
                borderHover: 'hover:border-orange-500/50',
              },
              'ban-mai': {
                glow: '#0284C7',
                halo: 'from-sky-500/25 via-cyan-500/15 to-transparent',
                badgeBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                borderHover: 'hover:border-sky-500/50',
              },
              'hoang-hon': {
                glow: '#F97316',
                halo: 'from-amber-500/25 via-rose-500/15 to-transparent',
                badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                borderHover: 'hover:border-amber-500/50',
              },
              'da-nguyet': {
                glow: '#818CF8',
                halo: 'from-indigo-500/25 via-purple-500/15 to-transparent',
                badgeBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
                borderHover: 'hover:border-indigo-500/50',
              },
            };

            const accent = themeAccents[store.id as keyof typeof themeAccents] || themeAccents['hoang-hon'];

            return (
              <Link
                key={store.id}
                href={`/stores/${store.slug}`}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2.5 ${accent.borderHover} hover:shadow-2xl`}
                style={{
                  boxShadow: `0 20px 50px -10px rgba(0, 0, 0, 0.5)`,
                }}
              >
                {/* Background Ambient Glow */}
                <div 
                  className={`absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br ${accent.halo} blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`} 
                />

                {/* Top Section */}
                <div className="relative z-10 space-y-4">
                  {/* Emoji & Badge */}
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-5xl transition-transform duration-500 group-hover:scale-115 group-hover:rotate-6 drop-shadow-md"
                    >
                      {store.theme.emoji}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider border ${accent.badgeBg}`}>
                      {store.slug}
                    </span>
                  </div>

                  {/* Store Name & Tagline */}
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white transition-colors group-hover:text-amber-300">
                      {store.name}
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2">
                      {store.description}
                    </p>
                  </div>

                  {/* Mood Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {store.effects.mood.split(', ').map((m) => (
                      <span
                        key={m}
                        className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-slate-300 capitalize"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Section: Palette Dots & CTA */}
                <div className="relative z-10 pt-8 mt-auto flex items-center justify-between border-t border-white/10">
                  {/* Palette preview */}
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ background: store.theme.primary }} />
                    <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ background: store.theme.secondary }} />
                    <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ background: store.theme.accent }} />
                  </div>

                  {/* Action Link */}
                  <div className="flex items-center gap-1.5 text-xs font-bold transition-all group-hover:translate-x-1" style={{ color: store.theme.primary }}>
                    <span>Khám phá ngay</span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, title: "Tốc Độ Cao", desc: "Tối ưu hóa phát video trực tiếp, không giật lag", color: "text-amber-400" },
            { icon: ShieldCheck, title: "Nhiều Máy Chủ", desc: "Tự động dự phòng nguồn khi phát sinh sự cố", color: "text-emerald-400" },
            { icon: Film, title: "Kho Phim Đa Dạng", desc: "Phim lẻ, phim bộ, anime, TV Shows liên tục", color: "text-sky-400" },
            { icon: Compass, title: "Lọc Thông Minh", desc: "Tìm kiếm nhanh theo thể loại, quốc gia, năm", color: "text-purple-400" },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.06] hover:border-white/20"
            >
              <div className={`p-2.5 rounded-xl bg-white/5 ${feature.color} shrink-0`}>
                <feature.icon size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">{feature.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
