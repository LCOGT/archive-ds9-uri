import { BrowserWindow } from "electron";
import { produceWithPatches, Draft, Patch } from "immer";

export interface LaunchTaskState {
  id: string;
  url: string;
  createdAt: number;
  sanitizedUrl: string;
  status:
    | "Initializing"
    | "Downloading"
    | "Launching"
    | "Launched"
    | "Closed"
    | "Aborting"
    | "Aborted"
    | "Failed"
    | "Done";
  frames: Record<string, FrameState>;
  stdout: string[];
  stderr: string[];
  cleanup: "Pending" | "Skip" | "Attempting" | "Done" | "Skipped";
  downloadDir?: string;
  error: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

export interface FrameState {
  id: string;
  status: "Initializing" | "Pending" | "Downloading" | "Downloaded" | "Deleted";
  filename?: string;
  filepath?: string;
  downloadUrl?: string;
  totalBytes?: number;
  downloadedBytes?: number;
  instrumentId?: string;
  reductionLevel?: number;
}

export type LaunchTaskStoreState = Record<
  LaunchTaskState["id"],
  LaunchTaskState
>;

interface LaunchTaskStore {
  get: () => LaunchTaskStoreState;
  set: (
    recipe: (draftState: Draft<LaunchTaskStoreState>) => void
  ) => LaunchTaskStoreState;
}

let state: LaunchTaskStoreState = {};

const notify = (patches: Patch[]) => {
  BrowserWindow.getAllWindows().forEach((w) => {
    w.webContents.send("launchTaskStore:patches", patches);
  });
};

export const launchTaskStore: LaunchTaskStore = {
  get: () => {
    return state;
  },
  set(recipe) {
    const [nextState, patches] = produceWithPatches(state, recipe);
    state = nextState;
    notify(patches);
    return state;
  },
};
