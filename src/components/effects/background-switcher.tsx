"use client";

import { useState } from "react";
import { Film, Sliders, EyeOff, Lightbulb, Sparkles, X, ChevronUp } from "lucide-react";

interface BackgroundSwitcherProps {
  spotlightEnabled: boolean;
  dustEnabled: boolean;
  intensity: "low" | "medium" | "high";
  onToggleSpotlight: () => void;
  onToggleDust: () => void;
  onChangeIntensity: (intensity: "low" | "medium" | "high") => void;
}

export function BackgroundSwitcher({
  spotlightEnabled,
  dustEnabled,
  intensity,
  onToggleSpotlight,
  onToggleDust,
  onChangeIntensity,
}: BackgroundSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 text-sm font-sans select-none">
      {/* Expanded Cinema Light Adjuster */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Điều chỉnh ánh sáng rạp chiếu"
          className="animate-in fade-in zoom-in-95 duration-200 flex w-[90vw] max-w-[340px] flex-col overflow-hidden rounded-2xl border border-amber-500/25 bg-[#0a0703]/95 p-4 text-slate-100 shadow-2xl backdrop-blur-2xl"
          style={{
            boxShadow: `0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 30px -5px rgba(251, 191, 36, 0.25)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/15 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs">
                <Film className="h-3.5 w-3.5 text-amber-400" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-amber-200">Đèn Chiếu 35mm T-Hexa</h3>
                <p className="text-[10px] text-slate-400">Hiệu ứng rạp chiếu phim chuẩn</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Thu nhỏ"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Toggles & Intensity */}
          <div className="pt-3 text-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-300 flex items-center gap-1.5 text-xs">
                <Sliders className="h-3.5 w-3.5 text-amber-400" />
                Độ sáng đèn chiếu:
              </span>
              <div className="flex items-center gap-1">
                {(["low", "medium", "high"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeIntensity(lvl)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                      intensity === lvl
                        ? "bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {lvl === "low" ? "Dịu" : lvl === "medium" ? "Chuẩn" : "Sáng"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onToggleSpotlight}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-[11px] transition-all ${
                  spotlightEnabled
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                    : "border-white/10 bg-white/5 text-slate-400"
                }`}
              >
                {spotlightEnabled ? (
                  <>
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                    <span>Đèn chiếu: Bật</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                    <span>Đèn chiếu: Tắt</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleDust}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-[11px] transition-all ${
                  dustEnabled
                    ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                    : "border-white/10 bg-white/5 text-slate-400"
                }`}
              >
                {dustEnabled ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>Bụi phim: Bật</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                    <span>Bụi phim: Tắt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discreet Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          type="button"
          className="group flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#0a0703]/90 px-3.5 py-2 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-amber-400/60 active:scale-95"
          style={{
            boxShadow: `0 6px 20px -3px rgba(0, 0, 0, 0.7), 0 0 14px -3px rgba(251, 191, 36, 0.3)`,
          }}
          aria-label="Tùy chỉnh đèn chiếu 35mm"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-bold">
            <Film className="h-3 w-3" />
          </span>
          <span className="text-[11px] font-semibold text-amber-200 group-hover:text-amber-100">
            Đèn Chiếu 35mm
          </span>
          <ChevronUp className="h-3.5 w-3.5 text-amber-400/70 transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}
    </div>
  );
}
