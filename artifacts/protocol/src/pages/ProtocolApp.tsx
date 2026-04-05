import { useProtocolStore } from "@/store/protocolStore";
import CalculatorPanel from "@/components/CalculatorPanel";
import SyringeDisplay from "@/components/SyringeDisplay";
import DoseLog from "@/components/DoseLog";
import ProtocolPanel from "@/components/ProtocolPanel";
import LockScreen from "@/components/LockScreen";
import AppShell from "@/components/AppShell";

export default function ProtocolApp() {
  const { isLocked, hasPassphrase } = useProtocolStore();

  if (isLocked && hasPassphrase) {
    return <LockScreen />;
  }

  return (
    <AppShell>
      <CalculatorPanel />
      <SyringeDisplay />
      <DoseLog />
      <ProtocolPanel />
    </AppShell>
  );
}
