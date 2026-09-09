import { ReactNode } from "react";

type PlotCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function PlotCard({ title, subtitle, children }: PlotCardProps) {
  return (
    <article className="card plot-card">
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      {children}

      <div className="loading-row">JSON-driven renderer · hover and select points</div>
    </article>
  );
}
