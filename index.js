const { app, BrowserWindow, protocol } = require("electron")
const  { URL } = require("url")
const { spawn } = require('node:child_process')

const createWindow = () => {
  const win = new BrowserWindow();

  win.loadURL("http://archive-dev.lco.gtn/");
};

app.whenReady().then(() => {
  protocol.registerHttpProtocol("lcods9", (request, callback) => {
    const u = new URL(request.url)
    console.log(u)

    // Launch an external command
    const ds9 = spawn("ds9", args=[], options={shell: true})

  })

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
