import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Documents | Collaborative Document Editor",
};

export default function DashboardPage() {
  return <Dashboard />;
}
