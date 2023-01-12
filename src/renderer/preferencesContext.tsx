import {
  useState,
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useEffect,
} from "react";
import { EuiText, EuiCodeBlock } from "@elastic/eui";

import {
  Preferences,
  isPreferences,
  PreferencesInput,
  preferencesWithGVK,
} from "../common/preferences";
import { useToast } from "./toastContext";

interface PreferencesContext {
  prefs: Preferences;
  setPrefs: (p: PreferencesInput) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContext>(null);

interface PreferencesProviderProps {
  children: ReactNode;
}

export const PreferencesProvider = ({ children }: PreferencesProviderProps) => {
  const [prefs, setPrefsInternal] = useState<Preferences | null>(null);
  const { addToast } = useToast();

  // initial load
  useEffect(() => {
    (async () => {
      const item = window.localStorage.getItem("prefs");
      if (item !== null) {
        try {
          const o: unknown = JSON.parse(item);
          if (isPreferences(o)) {
            await window.main.prefs.set(o);
            setPrefsInternal(o);
            return;
          } else {
            addToast({
              color: "danger",
              toastLifeTimeMs: 10000,
              text: (
                <>
                  <EuiText>
                    Previously saved preferences are incompatible:
                  </EuiText>
                  <EuiCodeBlock language="json">
                    {JSON.stringify(o, null, 2)}
                  </EuiCodeBlock>
                </>
              ),
            });
          }
        } catch (err) {
          addToast({
            color: "danger",
            toastLifeTimeMs: 10000,
            text: (
              <>
                <EuiText>Failed to parse saved preferences:</EuiText>
                <EuiCodeBlock language="text">{item}</EuiCodeBlock>
              </>
            ),
          });
        } finally {
          window.main.readyToHandle();
        }
      }

      const p = await window.main.prefs.get();
      setPrefsInternal(p);

      addToast({
        color: "warning",
        toastLifeTimeMs: 10000,
        text: (
          <>
            <EuiText>
              Using default preferences. Might want to configure them to your
              liking.
            </EuiText>
            <EuiCodeBlock language="json">
              {JSON.stringify(p, null, 2)}
            </EuiCodeBlock>
          </>
        ),
      });

      window.main.readyToHandle();
    })();
  }, []);

  const savePrefs = async (prefs: Preferences, sendToMain: boolean) => {
    if (sendToMain) {
      await window.main.prefs.set(prefs);
    }

    window.localStorage.setItem("prefs", JSON.stringify(prefs));

    setPrefsInternal(prefs);
  };

  const setPrefs = async (prefs: PreferencesInput) => {
    await savePrefs(preferencesWithGVK(prefs), true);
  };

  // subscribe to changes and update local state with it
  // effect runs once (ie subscription happens once, but savePrefs is called on every update)
  useEffect(() => {
    return window.main.prefs.subscribe((p) => {
      savePrefs(p, false);
    });
  }, []);

  const value = useMemo(() => {
    return { prefs, setPrefs };
  }, [prefs]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (ctx === null) {
    throw new Error(
      "components using usePreferences must be wrapped in <PreferencesProvider>...</PreferencesProvider>"
    );
  }
  return ctx;
};
