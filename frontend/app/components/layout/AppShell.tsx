"use client";

import { useState, type ReactNode } from "react";
import { RightPanel } from "@/app/components/layout/RightPanel";
import { Sidebar } from "@/app/components/layout/Sidebar";
import { TopNav } from "@/app/components/layout/TopNav";

type AppShellProps = {
children: ReactNode;
rightPanel?: boolean;
};

export function AppShell({
children,
rightPanel = true,
}: AppShellProps) {
const [panelCollapsed, setPanelCollapsed] = useState(false);

const workspaceClass = rightPanel
? `workspace with-panel${
        panelCollapsed ? " panel-collapsed" : ""
      }`
: "workspace chat-workspace";

return ( <div className="app-shell"> <Sidebar />


  <div className={workspaceClass}>
    <TopNav />
    {children}
  </div>

  {rightPanel ? (
    <RightPanel
      collapsed={panelCollapsed}
      onToggle={() =>
        setPanelCollapsed((value) => !value)
      }
    />
  ) : null}
</div>


);
}
