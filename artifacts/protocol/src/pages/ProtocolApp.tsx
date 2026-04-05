import { useEffect, useRef } from "react";
import { useProtocolStore } from "@/store/protocolStore";
import CalculatorPanel from "@/components/CalculatorPanel";
import SyringeDisplay from "@/components/SyringeDisplay";
import LogPanel from "@/components/LogPanel";
import ProtocolPanel from "@/components/ProtocolPanel";
import BiofeedbackPanel from "@/components/BiofeedbackPanel";
import SettingsPanel from "@/components/SettingsPanel";
import LockScreen from "@/components/LockScreen";
import AppShell from "@/components/AppShell";
import InstallPrompt from "@/components/InstallPrompt";

function CloudSyncOnMutation() {
  const {
    entries,
    protocols,
    templates,
    injectionSites,
    signedInUserId,
    syncToCloud,
  } = useProtocolStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!signedInUserId) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void syncToCloud(signedInUserId);
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [entries, protocols, templates, injectionSites, signedInUserId]);

  return null;
}

export default function ProtocolApp() {
  const { isLocked, hasPassphrase } = useProtocolStore();

  if (isLocked && hasPassphrase) {
    return <LockScreen />;
  }

  return (
    <>
      <CloudSyncOnMutation />
      <InstallPrompt />
      <AppShell>
        <CalculatorPanel />
        <SyringeDisplay />
        <LogPanel />
        <ProtocolPanel />
        <BiofeedbackPanel />
        <SettingsPanel />
      </AppShell>
    </>
  );
}
