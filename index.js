const { app, BrowserWindow, protocol, dialog } = require("electron");
const  { URL } = require("url");
const { spawn } = require("node:child_process");
const https = require('https');
const fs  = require("fs");
const path = require("path");

const SCHEME = "archive+ds9";
const DOWNLOAD_PATH = path.join('/tmp', 'archive_download');

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(SCHEME, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
    app.setAsDefaultProtocolClient(SCHEME)
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    const lastArg = commandLine.at(-1)
    if (lastArg.startsWith(`{SCHEME}://`)) {
      handleURL(lastArg)
    }

  })

  app.whenReady().then(() => {
    createWindow()

    const lastArg = process.argv.at(-1)
    if (lastArg.startsWith(`{SCHEME}://`)) {
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

async function downloadFile(url, destination) {
  return new Promise(function(resolve, reject) {
    const file = fs.createWriteStream(destination);
    const request = https.get(url, function(response) {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    });
  });
}

async function getFrameRecord(frameUrl, token) {
  return new Promise(function (resolve, reject) {
    var options = {
      headers: { Authorization: "Token " + token }
    }
    var req = https.get(frameUrl, options, function(res) {
      res.on('data', function (data) {
        var response = JSON.parse(data);
        resolve(response);
      });
    });
  });
}

async function handleURL(url) {
  const u = new URL(url);

  let urlParams = u.searchParams;
  const mkdirChild = spawn("mkdir", args=[DOWNLOAD_PATH], {env: {PATH: process.env.PATH}}, options={shell: true});

  // fetch archive frame records in parallel
  let frameRecordCalls = [];
  for (frame of urlParams.get("frame_ids").split(",")) {
    frameUrl = urlParams.get("frame_url") + frame + "/";
    frameRecordCalls.push(getFrameRecord(frameUrl, urlParams.get('token')));
  }

  let frameRecords = await Promise.all(frameRecordCalls);

  // download files in parallel
  let downloadCalls = [];
  for (record of frameRecords) {
    let destination = path.join(DOWNLOAD_PATH, record.filename);
    downloadCalls.push(downloadFile(record.url, destination));
  }

  // give the user some feedback when downloading images
  let windowAbortController = new AbortController();
  dialog.showMessageBox(BrowserWindow.getFocusedWindow(), {title: "Downloading", message: "Downloading images...", signal: windowAbortController.signal});

  await Promise.all(downloadCalls);
  windowAbortController.abort();

  // read in command line args for DS9 based on frame metadata
  let argsObj = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'ds9_args.json')));
  let ds9Args = (frameRecords[0].instrument_id.includes("fa") && frameRecords[0].reduction_level === 0) ? argsObj.mosaic : argsObj.nonMosaic;
  // need to add /usr/local/bin to PATH to find ds9
  const ds9Child = spawn("ds9", args=ds9Args, {env: {PATH: process.env.PATH + ":/usr/local/bin"}}, options={shell: true});


  // clear out temp directory when user closes DS9
  ds9Child.on("exit", function() {
    const rmChild = spawn("rm", args=["-rf", DOWNLOAD_PATH], {env: {PATH: process.env.PATH}}, options={shell: true});
  })
}
