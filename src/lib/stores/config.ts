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
    theme: {
      name: 'Bình Minh',
      slug: 'binh-minh',
      emoji: '🌅',
      description: 'Khoảnh khắc mặt trời vừa ló - Dịu dàng, thơ, ấm áp',

      background: '#FFF8F5',
      backgroundAlt: '#FEF3F0',
      surface: '#FFFFFF',
      surfaceHover: '#FFF5F0',

      primary: '#E8784A',
      primaryHover: '#D4693B',
      primaryMuted: '#FADCD3',

      secondary: '#F5A67D',
      accent: '#FFD166',

      text: '#4A3728',
      textSecondary: '#7D6455',
      textMuted: '#A89585',
      textInverse: '#FFFFFF',

      border: '#F0E6E0',
      borderHover: '#E5D5CA',
      glow: 'rgba(232, 120, 74, 0.3)',
      overlay: 'rgba(255, 248, 245, 0.95)',

      gradientStart: '#FFF0EA',
      gradientEnd: '#FFE8DE',
      gradientAccent: 'linear-gradient(135deg, #FFDAB3 0%, #F5A67D 50%, #E8784A 100%)',

      shadowSm: '0 2px 8px rgba(74, 55, 40, 0.06)',
      shadowMd: '0 4px 16px rgba(74, 55, 40, 0.08)',
      shadowLg: '0 8px 32px rgba(74, 55, 40, 0.12)',
      shadowGlow: '0 0 30px rgba(232, 120, 74, 0.25)',
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
    theme: {
      name: 'Ban Mai',
      slug: 'ban-mai',
      emoji: '☀️',
      description: 'Buổi sáng rõ nét - Tươi mới, sáng sủa, thoải mái',

      background: '#F8FAFC',
      backgroundAlt: '#F1F5F9',
      surface: '#FFFFFF',
      surfaceHover: '#F8FAFC',

      primary: '#0EA5E9',
      primaryHover: '#0284C7',
      primaryMuted: '#E0F2FE',

      secondary: '#06B6D4',
      accent: '#22C55E',

      text: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#94A3B8',
      textInverse: '#FFFFFF',

      border: '#E2E8F0',
      borderHover: '#CBD5E1',
      glow: 'rgba(14, 165, 233, 0.3)',
      overlay: 'rgba(248, 250, 252, 0.95)',

      gradientStart: '#F0F9FF',
      gradientEnd: '#E0F2FE',
      gradientAccent: 'linear-gradient(135deg, #7DD3FC 0%, #0EA5E9 50%, #0284C7 100%)',

      shadowSm: '0 2px 8px rgba(15, 23, 42, 0.05)',
      shadowMd: '0 4px 16px rgba(15, 23, 42, 0.08)',
      shadowLg: '0 8px 32px rgba(15, 23, 42, 0.12)',
      shadowGlow: '0 0 30px rgba(14, 165, 233, 0.25)',
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
    theme: {
      name: 'Hoàng Hôn',
      slug: 'hoang-hon',
      emoji: '🌆',
      description: 'Cuối ngày điện ảnh - Ấm áp, sâu lắng, hoài niệm',

      background: '#1C1917',
      backgroundAlt: '#292524',
      surface: '#292524',
      surfaceHover: '#3D3735',

      primary: '#F97316',
      primaryHover: '#EA580C',
      primaryMuted: 'rgba(249, 115, 22, 0.15)',

      secondary: '#DC2626',
      accent: '#FBBF24',

      text: '#FAFAF9',
      textSecondary: '#D6D3D1',
      textMuted: '#A8A29E',
      textInverse: '#1C1917',

      border: 'rgba(249, 115, 22, 0.2)',
      borderHover: 'rgba(249, 115, 22, 0.4)',
      glow: 'rgba(249, 115, 22, 0.4)',
      overlay: 'rgba(28, 25, 23, 0.9)',

      gradientStart: '#292524',
      gradientEnd: '#1C1917',
      gradientAccent: 'linear-gradient(135deg, #DC2626 0%, #F97316 50%, #FBBF24 100%)',

      shadowSm: '0 2px 8px rgba(0, 0, 0, 0.3)',
      shadowMd: '0 4px 16px rgba(0, 0, 0, 0.4)',
      shadowLg: '0 8px 32px rgba(0, 0, 0, 0.5)',
      shadowGlow: '0 0 30px rgba(249, 115, 22, 0.35)',
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
    theme: {
      name: 'Dạ Nguyệt',
      slug: 'da-nguyet',
      emoji: '🌙',
      description: 'Đêm trăng huyền bí - Sang trọng, tĩnh lặng, cuốn hút',

      background: '#030712',
      backgroundAlt: '#0F172A',
      surface: '#1E293B',
      surfaceHover: '#334155',

      primary: '#818CF8',
      primaryHover: '#6366F1',
      primaryMuted: 'rgba(129, 140, 248, 0.15)',

      secondary: '#38BDF8',
      accent: '#C084FC',

      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#64748B',
      textInverse: '#030712',

      border: 'rgba(129, 140, 248, 0.2)',
      borderHover: 'rgba(129, 140, 248, 0.4)',
      glow: 'rgba(129, 140, 248, 0.4)',
      overlay: 'rgba(3, 7, 18, 0.9)',

      gradientStart: '#0F172A',
      gradientEnd: '#030712',
      gradientAccent: 'linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #38BDF8 100%)',

      shadowSm: '0 2px 8px rgba(0, 0, 0, 0.4)',
      shadowMd: '0 4px 16px rgba(0, 0, 0, 0.5)',
      shadowLg: '0 8px 32px rgba(0, 0, 0, 0.6)',
      shadowGlow: '0 0 30px rgba(129, 140, 248, 0.35)',
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
