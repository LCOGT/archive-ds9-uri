import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  IpcMainEvent,
  dialog,
  OpenDialogOptions,
  OpenDialogReturnValue,
} from "electron";
import contextMenu from "electron-context-menu";
import path from "node:path";
import { SCHEME } from "../common/scheme";
import { handleURL, abortTask, deleteTask, readyToHandle } from "./handleURL";
import { getPreferences, setPreferences } from "./preferences";
import type { Preferences } from "../common/preferences";
import { launchTaskStore } from "./launchTaskStore";
import { enablePatches, enableMapSet } from "immer";

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(SCHEME, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(SCHEME);
}

// Attempt to grab the lock. If there's another instance running, emit a
// "second-instance" event to the other one and quit this one.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // this branch only happens once in the main instance

  // enable immer features
  enablePatches();
  enableMapSet();

  // setup context menu (copy, etc)
  contextMenu({
    showSearchWithGoogle: false,
    prepend: (_, parameters) => [
      {
        label: "Open w/ External Application",
        visible: !!parameters.linkURL,
        click: () => shell.openExternal(`${encodeURI(parameters.linkURL)}`),
      },
      {
        label: "Show in Folder",
        visible:
          !!parameters.linkURL && parameters.linkURL.startsWith("file://"),
        click: () =>
          shell.showItemInFolder(
            `${decodeURI(parameters.linkURL).replace("file://", "")}`
          ),
      },
    ],
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    const window = createWindow();

    app.on("second-instance", (_, args) => {
      if (window.isMinimized()) {
        window.restore();
      }
      window.focus();

      handleArgs(args);
    });

    // Open any links with target=_blank using the OS specific way of opening
    // links. This way links open in the user's browser.
    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url);
      return { action: "deny" };
    });

    // Setup event handlers called in the React app via preload.ts
    ipcMain.handle(
      "showOpenDialog",
      async (
        event: IpcMainEvent,
        options: OpenDialogOptions
      ): Promise<OpenDialogReturnValue> => {
        const window = BrowserWindow.fromWebContents(event.sender);
        return dialog.showOpenDialog(window, options);
      }
    );

    ipcMain.handle("appVersion", async () => {
      return app.getVersion();
    });

    ipcMain.on("handleUrl", (_: IpcMainEvent, url: string) => {
      handleURL(url);
    });

    ipcMain.on("readyToHandle", () => {
      readyToHandle.resolve();
    });

    ipcMain.handle("abortTask", async (_: IpcMainEvent, id: string) => {
      return await abortTask(id);
    });

    ipcMain.handle("deleteTask", async (_: IpcMainEvent, id: string) => {
      return await deleteTask(id);
    });

    ipcMain.handle("preferences:get", async (_event: IpcMainEvent) => {
      return getPreferences();
    });

    ipcMain.handle(
      "preferences:set",
      async (_: IpcMainEvent, p: Preferences) => {
        return setPreferences(p);
      }
    );

    ipcMain.handle("launchTaskStore:get", async (_event: IpcMainEvent) => {
      return launchTaskStore.get();
    });

    handleArgs(process.argv);
  });

  // This only works on MacOS.
  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleURL(url);
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  // Only for MacOS
  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

const handleArgs = (args: string[]) => {
  if (process.defaultApp && args.length >= 3) {
    const lastArg = args.at(-1);
    handleURL(lastArg);
  } else {
    if (args.length >= 2) {
      const lastArg = args.at(-1);
      handleURL(lastArg);
    }
  }
};

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 720,
    width: 1280,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.maximize();

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open DevTools by default in dev mode.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
};