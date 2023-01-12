import {
  useState,
  createContext,
  useContext,
  useMemo,
  ReactNode,
  useEffect,
} from "react";

import { applyPatches } from "immer";

import type { LaunchTaskStoreState } from "../main/launchTaskStore";

interface LaunchTasksContext {
  launchTasks: LaunchTaskStoreState;
}

const LaunchTasksContext = createContext<LaunchTasksContext>(null);

interface LaunchTasksProviderProps {
  children: ReactNode;
}

export const LaunchTasksProvider = ({ children }: LaunchTasksProviderProps) => {
  const [launchTasks, setLaunchTasks] = useState<LaunchTaskStoreState>({});

  useEffect(() => {
    const promise = (async () => {
      let tasks = await window.main.launchTasks.get();
      setLaunchTasks(tasks);

      return window.main.launchTasks.patches((p) => {
        const nextState = applyPatches(tasks, p);
        setLaunchTasks(nextState);
        tasks = nextState;
      });
    })();

    return () => {
      promise.then((unsubscribe) => unsubscribe());
    };
  }, []);

  const value = useMemo(() => {
    return { launchTasks };
  }, [launchTasks]);

  return (
    <LaunchTasksContext.Provider value={value}>
      {children}
    </LaunchTasksContext.Provider>
  );
};

export const useLaunchTasks = () => {
  const ctx = useContext(LaunchTasksContext);
  if (ctx === null) {
    throw new Error(
      "components using useLaunchTasks must be wrapped in <LaunchTasksProvider>...</LaunchTasksProvider>"
    );
  }
  return ctx;
};
