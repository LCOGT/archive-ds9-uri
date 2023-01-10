import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerFlatpak } from "@electron-forge/maker-flatpak";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";
import { SCHEME } from "./src/common/scheme";


const config: ForgeConfig = {
  packagerConfig: {
    protocols: [
      {
        name: "archive-ds9",
        schemes: [SCHEME],
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerDMG({}),
    new MakerFlatpak({
      options: {
        files: [],
        branch: process.env.npm_package_version || "master",
        base: "org.electronjs.Electron2.BaseApp",
        baseVersion: "22.08",
        runtime: "org.freedesktop.Platform",
        sdk: "org.freedesktop.Sdk",
        runtimeVersion: "22.08",
        mimeType: [`x-scheme-handler/${SCHEME}`],
        finishArgs: [
          "--share=network",
          "--share=ipc",
          "--socket=wayland",
          "--socket=x11",
          "--device=dri",
          "--socket=pulseaudio",
          "--talk-name=org.freedesktop.Notifications",
          "--talk-name=org.freedesktop.Flatpak",
          "--filesystem=home",
          "--filesystem=host",
          "--filesystem=/tmp",
        ],
        modules: [
          {
            name: "zypak",
            sources: [
              {
                type: "git",
                url: "https://github.com/refi64/zypak",
                tag: "v2022.04",
              },
            ],
          },
        ],
      },
    }),
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: "./src/renderer/index.html",
            js: "./src/renderer/index.ts",
            name: "main_window",
            preload: {
              js: "./src/preload.ts",
            },
          },
        ],
      },
    }),
  ],
};

export default config;
