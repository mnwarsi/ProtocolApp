const env = import.meta.env;

function isEnabled(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value === "true";
}

export const releaseFlags = {
  enableWearables: isEnabled(env.VITE_ENABLE_WEARABLES, false),
};
