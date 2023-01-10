import "@elastic/eui/dist/eui_theme_light.css";
import { EuiProvider, EuiGlobalToastList } from "@elastic/eui";

import { Header } from "./Header";
import { LaunchPage } from "./LaunchPage";
import { ToastProvider, useToast } from "./toastContext";
import { PreferencesProvider } from "./preferencesContext";
import { LaunchTasksProvider } from "./launchTasksContext";

const ToastList = () => {
  const { toasts, onDismissToast } = useToast();

  return (
    <EuiGlobalToastList
      side="left"
      toasts={toasts}
      dismissToast={onDismissToast}
      toastLifeTimeMs={3000}
    />
  );
};

export const App = () => {
  return (
    <EuiProvider colorMode="light">
      <ToastProvider>
        <PreferencesProvider>
          <LaunchTasksProvider>
            <Header></Header>
            <LaunchPage></LaunchPage>
            <ToastList></ToastList>
          </LaunchTasksProvider>
        </PreferencesProvider>
      </ToastProvider>
    </EuiProvider>
  );
};
