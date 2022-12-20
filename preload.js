const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  updateLog: (callback) => ipcRenderer.on('update-log', callback)
})
