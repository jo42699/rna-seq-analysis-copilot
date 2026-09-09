export const navigationTabs = ["Dashboard","Interpretation"] as const;

export function hrefForTab(tab: (typeof navigationTabs)[number]) {
  if (tab === "Dashboard") return "/dashboard";
  if (tab === "Interpretation") return "/interpretation";
  return "#";
}
