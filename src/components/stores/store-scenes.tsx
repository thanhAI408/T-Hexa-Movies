"use client";

import React from "react";
import Image from "next/image";

export interface ThematicSceneConfig {
  photoUrl: string;
  badge: string;
  subtitle: string;
  themeTitle: string;
  themeDesc: string;
  accentGlow: string;
  timeTag: string;
}

export const STORE_THEMES: Record<string, [ThematicSceneConfig, ThematicSceneConfig, ThematicSceneConfig]> = {
  "binh-minh": [
    {
      photoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
      badge: "🌅 HỪNG ĐÔNG ĐỈNH NÚI • 05:30 AM",
      subtitle: "Ánh rạng đông đầu tiên xuyên qua sương sớm",
      themeTitle: "Cung Vòm Hừng Đông",
      themeDesc: "Bình minh trên đỉnh núi sương mờ, khởi đầu ngày mới ngập tràn ánh sáng rực rỡ.",
      accentGlow: "rgba(249, 115, 22, 0.4)",
      timeTag: "05:30 SA",
    },
    {
      photoUrl: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85",
      badge: "☀️ ÁNH DƯƠNG RỰC VÀNG • 06:00 AM",
      subtitle: "Vầng thái dương khởi sinh vạn vật",
      themeTitle: "Ánh Dương Đồi Sương",
      themeDesc: "Những đồi cỏ xanh ngút ngàn đẫm sương mai được tắm trong ánh vàng ấm áp.",
      accentGlow: "rgba(245, 158, 11, 0.4)",
      timeTag: "06:00 SA",
    },
    {
      photoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
      badge: "🌊 RẠNG ĐÔNG BIỂN SỚM • 05:45 AM",
      subtitle: "Sóng biếc phản chiếu chân trời hồng cam",
      themeTitle: "Bình Minh Trên Biển",
      themeDesc: "Mặt trời nhô lên từ mặt biển êm ả, dát vàng lên từng gợn sóng vỗ bờ.",
      accentGlow: "rgba(251, 146, 60, 0.4)",
      timeTag: "05:45 SA",
    },
  ],
  "ban-mai": [
    {
      photoUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=85",
      badge: "☀️ NẮNG MAI QUA RỪNG • 08:30 AM",
      subtitle: "Những dải nắng mai tinh khôi rọi sáng",
      themeTitle: "Nắng Sớm Xuyên Rừng",
      themeDesc: "Tia nắng mai rực rỡ len lỏi qua tán cây rừng thông, không khí trong vắt dịu mát.",
      accentGlow: "rgba(56, 189, 248, 0.4)",
      timeTag: "08:30 SA",
    },
    {
      photoUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85",
      badge: "🌾 QUANG NẮNG ĐỒNG NỘI • 09:15 AM",
      subtitle: "Bầu trời quang đãng, tràn ngập sinh khí",
      themeTitle: "Quang Nắng Đồng Nội",
      themeDesc: "Ánh mặt trời ban mai trong trẻo trên đồng cỏ mênh mông dưới nền trời xanh ngắt.",
      accentGlow: "rgba(14, 165, 233, 0.4)",
      timeTag: "09:15 SA",
    },
    {
      photoUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85",
      badge: "🌿 VÒM NẮNG TƯƠI MỚI • 10:00 AM",
      subtitle: "Ánh sáng 5600K rực rỡ và thuần khiết",
      themeTitle: "Vòm Nắng Sớm Tươi Mới",
      themeDesc: "Không gian tràn đầy năng lượng tươi mới với ánh sáng điện ảnh sắc nét tự nhiên.",
      accentGlow: "rgba(2, 132, 199, 0.4)",
      timeTag: "10:00 SA",
    },
  ],
  "hoang-hon": [
    {
      photoUrl: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1200&q=85",
      badge: "🌇 RÁNG CHIỀU RỰC LỬA • 17:45 PM",
      subtitle: "Mây tía đỏ thắm nhuộm cả góc trời",
      themeTitle: "Ráng Chiều Rực Lửa",
      themeDesc: "Bầu trời hoàng hôn rực sắc đỏ cam và tím biếc, khoảnh khắc điện ảnh lộng lẫy.",
      accentGlow: "rgba(244, 63, 94, 0.4)",
      timeTag: "17:45 CH",
    },
    {
      photoUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=85",
      badge: "🔥 NHẬT LẠC CHÂN TRỜI • 18:15 PM",
      subtitle: "Vầng thái dương chìm dần vào lòng biển",
      themeTitle: "Nhật Lạc Chân Trời",
      themeDesc: "Quả cầu lửa đỏ thắm từ từ lặn xuống đường chân trời, dát vàng lên mặt nước.",
      accentGlow: "rgba(234, 88, 12, 0.4)",
      timeTag: "18:15 CH",
    },
    {
      photoUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=1200&q=85",
      badge: "🌆 CHIỀU TÀ HOÀNG KIM • 18:30 PM",
      subtitle: "Thời khắc chạng vạng đầy mê hoặc",
      themeTitle: "Chiều Tà Hoàng Kim",
      themeDesc: "Ánh tà dương tím vàng huyền ảo phủ lên dãy núi xa, khép lại một ngày rực rỡ.",
      accentGlow: "rgba(225, 29, 72, 0.4)",
      timeTag: "18:30 CH",
    },
  ],
  "da-nguyet": [
    {
      photoUrl: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=1200&q=85",
      badge: "🌙 CUNG TRĂNG BẠC • 23:00 PM",
      subtitle: "Trăng khuyết tỏa ánh bạc dịu êm giữa ngàn sao",
      themeTitle: "Cung Trăng Khuyết Huyền Ảo",
      themeDesc: "Vầng trăng lưỡi liềm chi tiết sắc nét nổi bật giữa bầu trời đêm nhung huyền bí.",
      accentGlow: "rgba(129, 140, 248, 0.4)",
      timeTag: "23:00 ĐÊM",
    },
    {
      photoUrl: "https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?auto=format&fit=crop&w=1200&q=85",
      badge: "🌕 NGUYỆT DẠ TOÀN CHIẾU • 00:00 AM",
      subtitle: "Trăng tròn vằng vặc soi sáng màn đêm",
      themeTitle: "Trăng Rằm Tỏa Sáng",
      themeDesc: "Mặt trăng tròn vằng vặc rọi luồng sáng bàng bạc xuyên qua những gợn mây đêm.",
      accentGlow: "rgba(165, 180, 252, 0.4)",
      timeTag: "00:00 ĐÊM",
    },
    {
      photoUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=85",
      badge: "🌌 VŨ TRỤ NGÂN HÀ • 02:00 AM",
      subtitle: "Dải Ngân Hà lấp lánh triệu triệu vì sao",
      themeTitle: "Dải Ngân Hà Vô Tận",
      themeDesc: "Vòm trời đêm sâu thẳm mở ra vũ trụ bao la với dải sao băng và ngân hà lấp lánh.",
      accentGlow: "rgba(99, 102, 241, 0.4)",
      timeTag: "02:00 SÁNG",
    },
  ],
};

/** Component hiển thị bức ảnh phong cảnh thật tràn viền với hiệu ứng phim điện ảnh */
export function RealScenicHero({
  slug,
  variantIndex,
  className = "",
}: {
  slug: string;
  variantIndex: number;
  className?: string;
}) {
  const scenes = STORE_THEMES[slug] || STORE_THEMES["binh-minh"];
  const scene = scenes[variantIndex] || scenes[0];

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Real High-Res Photography */}
      <Image
        src={scene.photoUrl}
        alt={scene.themeTitle}
        fill
        sizes="(max-width: 768px) 100vw, 25vw"
        className="object-cover transition-transform duration-700 group-hover:scale-108"
        priority
        unoptimized
      />

      {/* Cinematic Film Vignette Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />

      {/* Floating Theme Time & Location Badge */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-0.5 text-[9px] font-mono font-bold text-white/95 border border-white/20 backdrop-blur-md shadow-lg">
          {scene.badge}
        </span>
        <span className="text-[9px] font-mono font-medium text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
          {scene.timeTag}
        </span>
      </div>
    </div>
  );
}
