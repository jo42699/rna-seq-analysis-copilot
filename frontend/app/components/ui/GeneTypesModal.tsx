import type { GeneTypeCount } from "@/app/types/bioinformatics";

type GeneTypesModalProps = {
  geneTypes: GeneTypeCount[];
  onClose: () => void;
};

export function GeneTypesModal({
  geneTypes,
  onClose,
}: GeneTypesModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="card-head">
          <h3>Complete Gene Type Distribution</h3>
          <button onClick={onClose}>Close</button>
        </div>

        <div className="gene-types-scroll">
          {geneTypes.map(([type, count]) => (
            <div className="type-row" key={type}>
              <span>{type}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}