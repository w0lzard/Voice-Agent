"use client";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 rounded-full border-4 border-white/10 border-t-primary animate-spin"></div>
        <p className="text-xs text-slate-600 font-medium uppercase tracking-widest">Loading...</p>
      </div>
    </div>
  );
}
