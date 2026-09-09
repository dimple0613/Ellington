import React from "react";

/** Placeholder block that pulses while live data loads (T13). */
export function SkeletonBar({ w = "100%", h = 16, radius = 8 }: { w?: number | string; h?: number | string; radius?: number }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: radius }} />;
}

/** KPI-card row skeleton. */
export function KpiSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${count},1fr)`, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
          <SkeletonBar w="55%" h={10} />
          <div style={{ marginTop: 12 }}>
            <SkeletonBar w="70%" h={20} />
          </div>
          <div style={{ marginTop: 8 }}>
            <SkeletonBar w="45%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Card/table skeleton — simulates a rounded panel with header + body rows. */
export function PanelSkeleton({ headerW = 180, headerH = 18, rows = 8, cols = 6, rowH = 30 }: { headerW?: number | string; headerH?: number | string; rows?: number; cols?: number; rowH?: number }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "20px 22px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
      <div style={{ marginBottom: 18 }}>
        <SkeletonBar w={headerW} h={headerH} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14, alignItems: "center", padding: "7px 0", borderBottom: i < rows - 1 ? "1px solid #F6F7FA" : "none" }}>
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBar key={j} h={rowH} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full-screen loading block — spinner + optional label. */
export function LoadingBlock({ label = "Loading live data…" }: { label?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "30px 24px", boxShadow: "0 1px 3px rgba(20,22,31,.04)" }}>
      <div className="loading-block">
        <span className="loading-spinner" />
        {label}
      </div>
    </div>
  );
}