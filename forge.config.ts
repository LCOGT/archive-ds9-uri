import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerFlatpak } from "@electron-forge/maker-flatpak";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";
import { SCHEME } from "./src/common/scheme";

const stripSemverPrefix = (s: string | undefined) => {
  return s?.replace(/^(v)/, "");
};

const config: ForgeConfig = {
  packagerConfig: {
    protocols: [
      {
        name: "archive-ds9",
        schemes: [SCHEME],
      },
    ],
    // Squirrel/NuGet/rcedit doesn't like the "v" prefeix for semvers, so remove it
    appVersion:
      stripSemverPrefix(process.env.npm_package_version) || "0.0.0-unknown",
  },
  rebuildConfig: {},
  hooks: {
    readPackageJson: async (_, packageJson) => {
      // Strip the "v" prefix again for the makers.
      packageJson.version =
        stripSemverPrefix(packageJson.version) || "0.0.0-unknown";
      return packageJson;
    },
  },
  makers: [
    new MakerDMG({}),
    new MakerSquirrel({}),
    new MakerFlatpak({
      options: {
        files: [],
        branch: "stable",
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
