import type { ReactNode } from "react";

type GlassPageShellProps = {
  children: ReactNode;
  backdropText?: string;
  panelClassName?: string;
  className?: string;
};

export function GlassPageShell({
  children,
  backdropText = "INSIGHTA",
  panelClassName = "",
  className = "",
}: GlassPageShellProps) {
  return (
    <main className={`glass-shell ${className}`.trim()}>
      <div className="glass-shell-word" aria-hidden="true">
        {backdropText}
      </div>
      <section className={`glass-shell-panel ${panelClassName}`.trim()}>
        {children}
      </section>
    </main>
  );
}
