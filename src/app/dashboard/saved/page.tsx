import { redirect } from "next/navigation";

export const metadata = {
  title: "Saved"
};

export default function DashboardSavedPage() {
  redirect("/dashboard");
}
