module.exports = {
  packagerConfig: {
    protocols: [
      {
        name: "lcods9",
        schemes: ["lcods9"],
      },
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ['darwin', 'linux'],
    },
    {
      name: "@electron-forge/maker-dmg",
      config: {},
    },
    {
      name: "@electron-forge/maker-flatpak",
      config: {
        options: {
          runtimeVersion: "22.08",
          mimeType: ["x-scheme-handler/lcods9"],
          modules: [
            {
              name: "zypak",
              sources: [
                {
                  type: "git",
                  url: "https://github.com/refi64/zypak",
                  tag: "v2022.04"
                }
              ]
            }
          ],
        },
      },
    },
  ],
};
