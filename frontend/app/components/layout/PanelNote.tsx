export function PanelNote({ title, text }: { title: string; text: string }) {
  return (
    <section className="panel-card compact">
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}
