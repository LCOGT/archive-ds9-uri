export const PreferencesKind = "Preferences";
export const PreferencesApiVersion = "v1alpha6";

export interface Preferences {
  kind: typeof PreferencesKind;
  apiVersion: typeof PreferencesApiVersion;
  token: string;
  ds9: {
    path: string;
    args: string;
    mosaicArgs: string;
  };
  customDownloadDir: {
    enabled: boolean;
    path: string;
    cleanup: boolean;
  };
}

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type PreferencesInput = Optional<Preferences, "kind" | "apiVersion">;

export const isPreferences = (o: unknown): o is Preferences => {
  if (typeof o !== "object" || o === null) {
    return false;
  }
  return (
    "kind" in o &&
    o.kind === PreferencesKind &&
    "apiVersion" in o &&
    o.apiVersion === PreferencesApiVersion
  );
};

export const preferencesWithGVK = (p: PreferencesInput): Preferences => {
  return { kind: PreferencesKind, apiVersion: PreferencesApiVersion, ...p };
};
