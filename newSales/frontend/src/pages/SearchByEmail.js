// Thin wrapper to keep legacy route name while sharing the unified dashboard search
import Dashboard from "./Dashboard";

export default function SearchByEmail() {
  return <Dashboard pageTitle="Search by Email" presetFocus="email" />;
}
