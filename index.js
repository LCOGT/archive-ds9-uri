const { app, BrowserWindow, protocol, dialog } = require("electron")
const  { URL } = require("url")
const { spawn } = require("node:child_process")
const path = require("path")


const SCHEMA = "lcods9"

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(SCHEMA, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
    app.setAsDefaultProtocolClient(SCHEMA)
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    const lastArg = commandLine.at(-1)
    if (lastArg.startsWith(`{SCHEMA}://`)) {
      handleURL(lastArg)
    }

  })

  app.whenReady().then(() => {
    createWindow()

    const lastArg = process.argv.at(-1)
    if (lastArg.startsWith(`{SCHEMA}://`)) {
      handleURL(lastArg)
    }
  })

  app.on("open-url", (event, url) => {
    event.preventDefault()
    handleURL(url)
  })
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
})

const createWindow = () => {
  const win = new BrowserWindow();

  win.loadFile("index.html");
}

const handleURL = (url) => {
  const u = new URL(url)

  // TODO: add real DS9 command
  dialog.showErrorBox("Welcome Back", `You arrived from: ${url}`)

  // Launch an external command
  //const ds9 = spawn("ds9", args=[], options={shell: true})
}
