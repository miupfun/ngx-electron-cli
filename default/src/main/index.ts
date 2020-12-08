import {app, BrowserWindow} from 'electron';

app.on('ready', () => {
    const w = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    w.loadURL('http://localhost:4200');
    w.once('ready-to-show', () => {
        w.show();
    });
});
