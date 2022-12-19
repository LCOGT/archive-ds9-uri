const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  updateLog: (callback) => ipcRenderer.on('update-log', callback),
  clearLog: (callback) => ipcRenderer.on('clear-log', callback)
})
