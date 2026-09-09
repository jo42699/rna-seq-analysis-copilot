export function InfoCard({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="card table-card">
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          <p>Backend annotation summary</p>
        </div>
      </div>

      {rows.map(([label, value]) => (
        <div className="type-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
