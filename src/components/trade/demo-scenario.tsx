"use client";

/**
 * Demo scenario picker (spec §2/§9) — demo-ONLY testing tool that simulates
 * transaction outcomes (success / failed / rejected / insufficient) so every
 * transaction state can be exercised with zero real funds. Never rendered in
 * MAINNET mode.
 */

import { DEMO_SCENARIOS, type DemoScenario } from "@/lib/tx-provider";

export function DemoScenarioPicker({
  value,
  onChange,
  disabled,
}: {
  value: DemoScenario;
  onChange: (s: DemoScenario) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3.5 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Demo scenario — simulated outcomes</p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-amber-100/70">
        Pick what the simulated transaction should do. No real funds are ever used.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Demo transaction scenario">
        {DEMO_SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s.id)}
            aria-pressed={value === s.id}
            className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition disabled:opacity-50 ${
              value === s.id
                ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
