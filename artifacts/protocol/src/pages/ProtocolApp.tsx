import { useProtocolStore } from "@/store/protocolStore";
import CalculatorPanel from "@/components/CalculatorPanel";
import SyringeDisplay from "@/components/SyringeDisplay";
import LogPanel from "@/components/LogPanel";
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
      <LogPanel />
      <ProtocolPanel />
    </AppShell>
  );
}
