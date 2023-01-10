import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  OpenDialogOptions,
  OpenDialogReturnValue,
} from "electron";
import type { MainToast } from "./main/toast";
import type { Preferences } from "./common/preferences";
import type { LaunchTaskStoreState } from "./main/launchTaskStore";
import type { Result } from "./common/result";
import type { Patch } from "immer";

interface IMainAPI {
  showOpenDialog: (
    options: OpenDialogOptions
  ) => Promise<OpenDialogReturnValue>;
  appVersion: () => Promise<string>;
  readyToHandle: () => void;
  handleUrl: (url: string) => void;
  abortTask: (id: string) => Promise<Result<void, string>>;
  deleteTask: (id: string) => Promise<Result<void, string>>;
  toasts: {
    subscribe: (listener: (toast: MainToast) => void) => () => void;
  };
  prefs: {
    get: () => Promise<Preferences>;
    set: (p: Preferences) => Promise<Preferences>;
    subscribe: (listener: (p: Preferences) => void) => () => void;
  };
  launchTasks: {
    get: () => Promise<LaunchTaskStoreState>;
    patches: (listener: (p: Patch[]) => void) => () => void;
  };
}

declare global {
  interface Window {
    main: IMainAPI;
  }
}

contextBridge.exposeInMainWorld("main", {
  showOpenDialog: async (
    options: OpenDialogOptions
  ): Promise<OpenDialogReturnValue> => {
    return ipcRenderer.invoke("showOpenDialog", options);
  },
  appVersion: async (): Promise<string> => {
    return await ipcRenderer.invoke("appVersion");
  },
  readyToHandle: () => {
    ipcRenderer.send("readyToHandle");
  },
  handleUrl: (url) => {
    ipcRenderer.send("handleUrl", url);
  },
  abortTask: async (id): Promise<Result<void, string>> => {
    return await ipcRenderer.invoke("abortTask", id);
  },
  deleteTask: async (id): Promise<Result<void, string>> => {
    return await ipcRenderer.invoke("deleteTask", id);
  },
  toasts: {
    subscribe: (listener) => {
      const handler = (_: IpcRendererEvent, t: MainToast): void => {
        listener(t);
      };

      ipcRenderer.on("toasts", handler);

      const unsubscribe = () => {
        ipcRenderer.removeListener("toasts", handler);
      };

      return unsubscribe;
    },
  },
  prefs: {
    get: async (): Promise<Preferences> => {
      return ipcRenderer.invoke("preferences:get");
    },
    set: async (p: Preferences): Promise<Preferences> => {
      return ipcRenderer.invoke("preferences:set", p);
    },
    subscribe: (listener) => {
      const handler = (_: IpcRendererEvent, p: Preferences): void => {
        listener(p);
      };

      ipcRenderer.on("preferences:update", handler);

      const unsubscribe = () => {
        ipcRenderer.removeListener("preferences:update", handler);
      };

      return unsubscribe;
    },
  },
  launchTasks: {
    get: async (): Promise<LaunchTaskStoreState> => {
      return ipcRenderer.invoke("launchTaskStore:get");
    },
    patches: (listener) => {
      const handler = (_: IpcRendererEvent, p: Patch[]): void => {
        listener(p);
      };

      ipcRenderer.on("launchTaskStore:patches", handler);

      const unsubscribe = () => {
        ipcRenderer.removeListener("launchTaskStore:patches", handler);
      };

      return unsubscribe;
    },
  },
} as IMainAPI);
