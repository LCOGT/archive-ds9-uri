const { app, BrowserWindow, protocol, dialog } = require("electron");
const  { URL } = require("url");
const { spawn } = require("node:child_process");
const https = require('https');
const fs  = require("fs");
const path = require("path");

const SCHEMA = "archive+ds9"

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

async function downloadFile(url, destination) {
  return new Promise(function(resolve, reject) {
    const file = fs.createWriteStream(destination);
    const request = https.get(url, function(response) {
      response.pipe(file);
      // after download completed close filestream and resolve promise
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
  const mkdirChild = spawn("mkdir", args=["/tmp/archive_download"], {env: {PATH: process.env.PATH}}, options={shell: true});

  let frameRecordCalls = [];
  for (frame of urlParams.get("frame_ids").split(",")) {
    frameUrl = urlParams.get("frame_url") + frame + "/";
    frameRecordCalls.push(getFrameRecord(frameUrl, urlParams.get('token')));
  }

  let frameRecords = await Promise.all(frameRecordCalls);

  let downloadCalls = [];
  for (record of frameRecords) {
    let destination = "/tmp/archive_download/" + record.filename;
    downloadCalls.push(downloadFile(record.url, destination));
  }

  await Promise.all(downloadCalls);
  console.log("Opening DS9!");

  if (frameRecords[0].instrument_id.includes("fa") && frameRecords[0].reduction_level === 0) {
    // open in mosaic mode
    ds9Args = [
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
      "-mosaicimage",
      "iraf",
      "/tmp/archive_download/*"
    ]
  }
  else {
    // open in non-mosaic modes
    ds9Args = [
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
      "/tmp/archive_download/*"
    ]
  }
  const ds9Child = spawn("ds9", args=ds9Args, {env: {PATH: "/usr/local/bin"}}, options={shell: true});

  ds9Child.on("exit", function() {
    const rmChild = spawn("rm", args=["-rf", "/tmp/archive_download"], {env: {PATH: process.env.PATH}}, options={shell: true});
  })
}
