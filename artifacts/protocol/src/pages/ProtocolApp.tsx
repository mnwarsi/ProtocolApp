import CalculatorPanel from "@/components/CalculatorPanel";
import SyringeDisplay from "@/components/SyringeDisplay";
import DoseLog from "@/components/DoseLog";
import AppShell from "@/components/AppShell";

export default function ProtocolApp() {
  return (
    <AppShell>
      <CalculatorPanel />
      <SyringeDisplay />
      <DoseLog />
    </AppShell>
  );
}
