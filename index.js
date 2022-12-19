const { app, BrowserWindow, protocol, ipcMain } = require("electron");
const  { URL } = require("url");
const { spawn } = require("node:child_process");
const https = require('https');
const fs  = require("fs");
const { rm } = require("node:fs/promises");
const path = require("path");
const os = require("os");

const SCHEME = "archive+ds9";
const TEMPDIR_PREFIX="archive-ds9-temp-"
var WINDOW = null;

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
    window = createWindow();

    const lastArg = process.argv.at(-1)
    if (lastArg.startsWith(`{SCHEME}://`)) {
      handleURL(lastArg, WINDOW)
    }
  })

  app.on("open-url", (event, url) => {
    event.preventDefault()
    handleURL(url, WINDOW)
  })
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
})

createWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile("index.html");
  // assign to global-scope variable since we'll use this for log messages
  WINDOW = win;
}

function printMessage(message) {
  WINDOW.webContents.send('update-log', message);
}

async function downloadFile(frameRecord, destination) {
  return new Promise(function(resolve, reject) {
    const file = fs.createWriteStream(destination);
    const request = https.get(frameRecord.url, function(response) {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(frameRecord);
      });
    }).on('error', (e) => {
      reject(e);
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
    }).on('error', (e) => {
      reject(e);
    });
  });
}

function openDS9(frameRecords, temp_directory) {
  printMessage("Opening in DS9!");
  // read in command line args for DS9 based on frame metadata
  let argsObj = JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'ds9_args.json')));
  let ds9Args = (frameRecords[0].instrument_id.includes("fa") && frameRecords[0].reduction_level === 0) ? argsObj.mosaic : argsObj.nonMosaic;
  ds9Args.push(path.join(temp_directory, '*'))
  // need to add /usr/local/bin to PATH to find ds9
  // TODO: Make this user-configurable
  const ds9Child = spawn("ds9", args=ds9Args, {env: {PATH: process.env.PATH + ":/usr/local/bin"}}, options={shell: true});

  ds9Child.on("exit", async function(code) {
    printMessage(`DS9 process exited with code ${code}. \n Temporary directory ${temp_directory} will now be purged.`);
    await rm(temp_directory, {'force': true, 'recursive': true});
  })
  ds9Child.on("error", async function (error) {
    await rm(temp_directory, {'force': true, 'recursive': true});
    printMessage(`We've encountered an error opening DS9 \n\n ${error.stack} \n\n Temporary directory ${temp_directory} will now be purged.`);
  })
}

function handleURL(url) {
  fs.mkdtemp(path.join(os.tmpdir(), TEMPDIR_PREFIX), (err, directory) => {
    if (err) {
      printMessage(`Error during creation of temporary directory \n\n ${err}`);
    }
    else {
      const u = new URL(url);
      let urlParams = u.searchParams;

      let frameRecordCalls = [];
      for (frame of urlParams.get("frame_ids").split(",")) {
        frameUrl = urlParams.get("frame_url") + frame + "/";
        frameRecordCalls.push(getFrameRecord(frameUrl, urlParams.get('token')));
      }
    
      // fetch all frame records in parallel
      Promise.all(frameRecordCalls).then( 
        (frameRecords) => {
          let downloadCalls = [];
          for (record of frameRecords) {
            let destination = path.join(directory, record.filename);
            downloadCalls.push(downloadFile(record, destination));
          }
          printMessage(`Downloading ${frameRecords.length} frames!`);
          // now download all frames in parallel
          Promise.all(downloadCalls).then(
            (frameRecords) => {
              openDS9(frameRecords, directory)
            },
            // if there were any errors, log them to the window and clear out the tempdir
            async function(reason){
              printMessage(reason);
              await rm(temp_directory, {'force': true, 'recursive': true});
            }
          )
        },
        async function(reason){
          printMessage(reason);
          await rm(temp_directory, {'force': true, 'recursive': true});
        })
    }
  })
}
