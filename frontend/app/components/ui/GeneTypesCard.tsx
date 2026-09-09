import type { GeneTypeCount } from "@/app/types/bioinformatics";

type GeneTypesCardProps = {
  geneTypes: GeneTypeCount[];
  onExpand: () => void;
};

export function GeneTypesCard({ geneTypes, onExpand }: GeneTypesCardProps) {
  return (
    <div className="card table-card">
      <div className="card-head">
        <div>
          <h3>Gene Types</h3>
          <p>Distribution from annotation metadata</p>
        </div>
        <button onClick={onExpand}>Expand</button>
      </div>

   <div className="gene-types-scroll">
        {geneTypes.slice(0, 5).map(([type, count]) => (
          <div className="type-row" key={type}>
            <span>{type}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
