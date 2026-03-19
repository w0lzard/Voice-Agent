"use client";

const STATE_CONFIG = {
  connecting:   { label: "Connecting",   color: "text-yellow-400", dot: "bg-yellow-400", pulse: true  },
  initializing: { label: "Initializing", color: "text-yellow-300", dot: "bg-yellow-300", pulse: true  },
  listening:    { label: "Listening",    color: "text-green-400",  dot: "bg-green-400",  pulse: false },
  thinking:     { label: "Thinking",     color: "text-blue-400",   dot: "bg-blue-400",   pulse: true  },
  speaking:     { label: "Speaking",     color: "text-purple-400", dot: "bg-purple-400", pulse: true  },
  idle:         { label: "Idle",         color: "text-gray-400",   dot: "bg-gray-400",   pulse: false },
  disconnected: { label: "Disconnected", color: "text-red-400",    dot: "bg-red-400",    pulse: false },
};

export function StatusBadge({ state }) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.disconnected;
  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${cfg.color}`}>
      <span className="relative flex h-2.5 w-2.5">
        {cfg.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
      </span>
      {cfg.label}
    </span>
  );
}
