import os from "node:os";
import { BrowserWindow } from "electron";
import { Preferences, preferencesWithGVK } from "../common/preferences";

const defaultDs9Args = [
  "-geometry",
  "1000x1000",
  "-view",
  "keyword",
  "yes",
  "-view",
  "keyvalue",
  "filter",
  "-view",
  "frame",
  "no",
  "-zscale",
  "-lock",
  "frame",
  "image",
  "-lock",
  "scale",
  "yes",
].join(" ");

export const defaultPrefs = (): Preferences => {
  return preferencesWithGVK({
    token: "change-me",
    ds9: {
      path: os.tmpdir(),
      args: defaultDs9Args,
      mosaicArgs: `${defaultDs9Args} -mosaic`,
    },
    customDownloadDir: {
      enabled: false,
      path: "",
      cleanup: true,
    },
  });
};

let preferences = defaultPrefs();

const notify = (p: Preferences) => {
  BrowserWindow.getAllWindows().forEach((w) => {
    w.webContents.send("preferences:update", p);
  });
};

export const setPreferences = (p: Preferences): Preferences => {
  preferences = p;
  notify(p);
  return preferences;
};

export const getPreferences = (): Preferences => {
  return preferences;
};
