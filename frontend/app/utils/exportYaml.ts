export function downloadYaml(yaml: string, filename = "analysis-report.yaml") {
  if (!yaml) return;

  const blob = new Blob([yaml], {
    type: "application/x-yaml;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}