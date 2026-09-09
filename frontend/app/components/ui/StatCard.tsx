import { SummaryIcon } from "@/app/components/icons/SummaryIcon";
import type { SummaryIconName } from "@/app/types/bioinformatics";

type StatCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: SummaryIconName;
};

export function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <article className="stat-card">
      <SummaryIcon name={icon} />
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{subtitle}</p>
    </article>
  );
}
