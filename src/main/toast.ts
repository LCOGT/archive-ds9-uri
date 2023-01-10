import { BrowserWindow } from "electron";
import type { Toast as EuiToast } from "@elastic/eui/src/components/toast/global_toast_list";

type UnionKeys<T> = T extends T ? keyof T : never;
type StrictUnionHelper<T, TAll> = T extends unknown
  ? T & Partial<Record<Exclude<UnionKeys<TAll>, keyof T>, never>>
  : never;
type OneOf<T> = StrictUnionHelper<T, T>;

type TextToast = Pick<EuiToast, "title" | "color" | "text" | "toastLifeTimeMs">;
type MarkdownToast = Omit<TextToast, "text"> & { markdown?: string };

export type MainToast = OneOf<TextToast | MarkdownToast>;

export const sendToast = (t: MainToast) => {
  BrowserWindow.getAllWindows().forEach((w) => {
    w.webContents.send("toasts", t);
  });
};
