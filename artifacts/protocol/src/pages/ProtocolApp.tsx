import { useEffect, useRef, useState } from "react";
import { useProtocolStore } from "@/store/protocolStore";
import SettingsPanel from "@/components/SettingsPanel";
import LockScreen from "@/components/LockScreen";
import AppShell, { type AppTab } from "@/components/AppShell";
import InstallPrompt from "@/components/InstallPrompt";
import TodayPanel from "@/components/TodayPanel";
import LibraryPanel from "@/components/LibraryPanel";
import InventoryPanel from "@/components/InventoryPanel";
import InsightsPanel from "@/components/InsightsPanel";

function CloudSyncOnMutation() {
  const {
    entries,
    protocols,
    templates,
    injectionSites,
    inventoryVials,
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
  }, [entries, protocols, templates, injectionSites, inventoryVials, signedInUserId]);

  return null;
}

export default function ProtocolApp() {
  const { isLocked, hasPassphrase } = useProtocolStore();
  const [activeTab, setActiveTab] = useState<AppTab>("today");

  if (isLocked && hasPassphrase) {
    return <LockScreen />;
  }

  return (
    <>
      <CloudSyncOnMutation />
      <InstallPrompt />
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        todaySlot={
          <TodayPanel
            onOpenInventory={() => setActiveTab("inventory")}
            onOpenInsights={() => setActiveTab("insights")}
          />
        }
        librarySlot={<LibraryPanel />}
        inventorySlot={<InventoryPanel />}
        insightsSlot={<InsightsPanel />}
        settingsSlot={<SettingsPanel />}
      />
    </>
  );
}
