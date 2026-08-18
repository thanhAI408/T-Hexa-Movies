export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#f4b55e]" />
        <p className="mt-4 text-[#8896a9]">Đang tải...</p>
      </div>
    </div>
  );
}
