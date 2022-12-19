const logPane = document.getElementById('log-pane')

window.electronAPI.updateLog((event, message) => {
    logPane.innerText = message;
    event.sender.send('update-log', message);
})

window.electronAPI.clearLog(() => {
    logPane.innerText = "";
})
