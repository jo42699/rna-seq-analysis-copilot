export function Markdown({ text }: { text: string }) {
  return (
    <div>
      {text.split("\n").map((line, index) => {
        if (line.startsWith("## ")) {
          return <h2 key={index}>{line.slice(3)}</h2>;
        }

        if (!line) {
          return <br key={index} />;
        }

        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}
