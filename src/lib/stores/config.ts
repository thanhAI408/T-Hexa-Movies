// Cinematic Theme System - 4 Moods Throughout the Day
// Bình Minh: Dawn - Soft, warm, hopeful
// Ban Mai: Morning - Bright, fresh, airy
// Hoàng Hôn: Sunset - Cinematic, warm, nostalgic
// Dạ Nguyệt: Moonlight - Dark, elegant, mysterious

export interface CinematicTheme {
  name: string;
  slug: string;
  emoji: string;
  description: string;

  // Background
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceHover: string;
  muted: string;

  // Primary colors
  primary: string;
  primaryHover: string;
  primaryMuted: string;

  // Accent colors
  secondary: string;
  accent: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Borders & Effects
  border: string;
  borderHover: string;
  glow: string;
  overlay: string;

  // Gradients
  gradientStart: string;
  gradientEnd: string;
  gradientAccent: string;

  // Shadows
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowGlow: string;
}

export interface StoreConfig {
  id: string;
  name: string;
  slug: string;
  description: string;
  theme: CinematicTheme;
  effects: {
    hasParticles: boolean;
    hasGlow: boolean;
    hasShimmer: boolean;
    mood: string;
  };
}

// API mapping: tên hiển thị -> provider API gốc
export const STORE_API_MAP: Record<string, string> = {
  'binh-minh': 'vsmov',
  'ban-mai': 'ophim',
  'hoang-hon': 'nguonc',
  'da-nguyet': 'kkphim',
};

export const STORES: Record<string, StoreConfig> = {
  // ============================================
  // THEME 1: BÌNH MINH - Dawn
  // Soft, warm, hopeful - khoảnh khắc mặt trời vừa ló
  // ============================================
  'binh-minh': {
    id: 'binh-minh',
    name: 'Bình Minh',
    slug: 'binh-minh',
    description: 'Khoảnh khắc mặt trời vừa ló - Dịu dàng, ấm áp, đậm chất thơ',
    theme: {
      name: 'Bình Minh',
      slug: 'binh-minh',
      emoji: '🌅',
      description: 'Khoảnh khắc mặt trời vừa ló - Dịu dàng, ấm áp, đậm chất thơ',

      background: '#FAF6F0',
      backgroundAlt: '#F3EDE2',
      surface: '#FFFFFF',
      surfaceHover: '#FFF8F3',
      muted: '#F5EFE6',

      primary: '#EA580C',
      primaryHover: '#C2410C',
      primaryMuted: 'rgba(234, 88, 12, 0.12)',

      secondary: '#F97316',
      accent: '#EAB308',

      text: '#1C1917',
      textSecondary: '#44403C',
      textMuted: '#78716C',
      textInverse: '#FFFFFF',

      border: 'rgba(234, 88, 12, 0.16)',
      borderHover: 'rgba(234, 88, 12, 0.35)',
      glow: 'rgba(234, 88, 12, 0.28)',
      overlay: 'rgba(250, 246, 240, 0.92)',

      gradientStart: '#FFF1E7',
      gradientEnd: '#FFE4D1',
      gradientAccent: 'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)',

      shadowSm: '0 2px 10px rgba(194, 65, 12, 0.08)',
      shadowMd: '0 8px 24px rgba(194, 65, 12, 0.12)',
      shadowLg: '0 16px 40px rgba(194, 65, 12, 0.16)',
      shadowGlow: '0 0 32px rgba(234, 88, 12, 0.25)',
    },
    effects: {
      hasParticles: true,
      hasGlow: true,
      hasShimmer: true,
      mood: 'hopeful, romantic, poetic',
    },
  },

  // ============================================
  // THEME 2: BAN MAI - Morning
  // Bright, fresh, airy - buổi sáng rõ nét, năng lượng tích cực
  // ============================================
  'ban-mai': {
    id: 'ban-mai',
    name: 'Ban Mai',
    slug: 'ban-mai',
    description: 'Buổi sáng rõ nét - Tươi mới, tràn đầy năng lượng tích cực',
    theme: {
      name: 'Ban Mai',
      slug: 'ban-mai',
      emoji: '☀️',
      description: 'Buổi sáng rõ nét - Tươi mới, tràn đầy năng lượng tích cực',

      background: '#F0F7FF',
      backgroundAlt: '#E0EFFF',
      surface: '#FFFFFF',
      surfaceHover: '#F0F9FF',
      muted: '#EBF4FE',

      primary: '#0284C7',
      primaryHover: '#0369A1',
      primaryMuted: 'rgba(2, 132, 199, 0.12)',

      secondary: '#06B6D4',
      accent: '#10B981',

      text: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',

      border: 'rgba(2, 132, 199, 0.18)',
      borderHover: 'rgba(2, 132, 199, 0.38)',
      glow: 'rgba(2, 132, 199, 0.25)',
      overlay: 'rgba(240, 247, 255, 0.92)',

      gradientStart: '#E0F2FE',
      gradientEnd: '#BAE6FD',
      gradientAccent: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 50%, #0369A1 100%)',

      shadowSm: '0 2px 10px rgba(2, 132, 199, 0.08)',
      shadowMd: '0 8px 24px rgba(2, 132, 199, 0.12)',
      shadowLg: '0 16px 40px rgba(2, 132, 199, 0.16)',
      shadowGlow: '0 0 32px rgba(2, 132, 199, 0.25)',
    },
    effects: {
      hasParticles: true,
      hasGlow: true,
      hasShimmer: true,
      mood: 'fresh, uplifting, clear',
    },
  },

  // ============================================
  // THEME 3: HOÀNG HÔN - Sunset
  // Cinematic, warm, nostalgic - cuối ngày, sâu lắng, quyến rũ
  // ============================================
  'hoang-hon': {
    id: 'hoang-hon',
    name: 'Hoàng Hôn',
    slug: 'hoang-hon',
    description: 'Cuối ngày điện ảnh - Ấm áp, sâu lắng, hoài niệm',
    theme: {
      name: 'Hoàng Hôn',
      slug: 'hoang-hon',
      emoji: '🌆',
      description: 'Cuối ngày điện ảnh - Ấm áp, sâu lắng, hoài niệm',

      background: '#0C0A09',
      backgroundAlt: '#171412',
      surface: '#1C1917',
      surfaceHover: '#292524',
      muted: '#171412',

      primary: '#F97316',
      primaryHover: '#FB923C',
      primaryMuted: 'rgba(249, 115, 22, 0.16)',

      secondary: '#EF4444',
      accent: '#FBBF24',

      text: '#FAFAF9',
      textSecondary: '#D6D3D1',
      textMuted: '#A8A29E',
      textInverse: '#0C0A09',

      border: 'rgba(249, 115, 22, 0.22)',
      borderHover: 'rgba(249, 115, 22, 0.45)',
      glow: 'rgba(249, 115, 22, 0.35)',
      overlay: 'rgba(12, 10, 9, 0.92)',

      gradientStart: '#1C1917',
      gradientEnd: '#0C0A09',
      gradientAccent: 'linear-gradient(135deg, #EF4444 0%, #F97316 50%, #FBBF24 100%)',

      shadowSm: '0 2px 10px rgba(0, 0, 0, 0.5)',
      shadowMd: '0 8px 24px rgba(0, 0, 0, 0.6)',
      shadowLg: '0 16px 48px rgba(0, 0, 0, 0.7)',
      shadowGlow: '0 0 35px rgba(249, 115, 22, 0.35)',
    },
    effects: {
      hasParticles: true,
      hasGlow: true,
      hasShimmer: true,
      mood: 'cinematic, dramatic, nostalgic',
    },
  },

  // ============================================
  // THEME 4: DẠ NGUYỆT - Moonlight
  // Dark, elegant, mysterious - đêm trăng, tĩnh lặng, huyền bí
  // ============================================
  'da-nguyet': {
    id: 'da-nguyet',
    name: 'Dạ Nguyệt',
    slug: 'da-nguyet',
    description: 'Đêm trăng huyền bí - Sang trọng, tĩnh lặng, cuốn hút',
    theme: {
      name: 'Dạ Nguyệt',
      slug: 'da-nguyet',
      emoji: '🌙',
      description: 'Đêm trăng huyền bí - Sang trọng, tĩnh lặng, cuốn hút',

      background: '#030712',
      backgroundAlt: '#0B0F19',
      surface: '#111827',
      surfaceHover: '#1F2937',
      muted: '#0B0F19',

      primary: '#818CF8',
      primaryHover: '#A5B4FC',
      primaryMuted: 'rgba(129, 140, 248, 0.16)',

      secondary: '#38BDF8',
      accent: '#C084FC',

      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#94A3B8',
      textInverse: '#030712',

      border: 'rgba(129, 140, 248, 0.22)',
      borderHover: 'rgba(129, 140, 248, 0.45)',
      glow: 'rgba(129, 140, 248, 0.35)',
      overlay: 'rgba(3, 7, 18, 0.92)',

      gradientStart: '#0B0F19',
      gradientEnd: '#030712',
      gradientAccent: 'linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #38BDF8 100%)',

      shadowSm: '0 2px 10px rgba(0, 0, 0, 0.5)',
      shadowMd: '0 8px 24px rgba(0, 0, 0, 0.6)',
      shadowLg: '0 16px 48px rgba(0, 0, 0, 0.7)',
      shadowGlow: '0 0 35px rgba(129, 140, 248, 0.35)',
    },
    effects: {
      hasParticles: true,
      hasGlow: true,
      hasShimmer: true,
      mood: 'mysterious, elegant, immersive',
    },
  },
};

export const STORE_LIST = Object.values(STORES);
export const THEME_KEY = 'cinematic-theme';

// Get theme from localStorage or default to Hoàng Hôn (cinematic)
export function getStoredTheme(): string {
  if (typeof window === 'undefined') return 'hoang-hon';
  const stored = localStorage.getItem(THEME_KEY);
  return stored && STORES[stored] ? stored : 'hoang-hon';
}

// Save theme to localStorage
export function saveTheme(themeSlug: string) {
  if (typeof window === 'undefined') return;
  if (STORES[themeSlug]) {
    localStorage.setItem(THEME_KEY, themeSlug);
  }
}
