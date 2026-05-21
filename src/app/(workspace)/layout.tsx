"use client";

import { WorkspaceGuard } from "@/components/workspace-guard";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceGuard>{children}</WorkspaceGuard>;
}
