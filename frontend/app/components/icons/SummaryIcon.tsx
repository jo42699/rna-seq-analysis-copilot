import { Dna, GitBranch, Sigma, Sparkles, Tag, TestTube } from "lucide-react";
import type { ReactNode } from "react";
import type { SummaryIconName } from "@/app/types/bioinformatics";

const icons: Record<SummaryIconName, ReactNode> = {
  dna: <Dna size={18} />,
  sample: <TestTube size={18} />,
  sigma: <Sigma size={18} />,
  spark: <Sparkles size={18} />,
  tag: <Tag size={18} />,
  path: <GitBranch size={18} />,
};

export function SummaryIcon({ name }: { name: SummaryIconName }) {
  return <span className="icon">{icons[name]}</span>;
}
