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
    w.loadURL(process.env.$RENDER);
    w.once('ready-to-show', () => {
        w.show();
    });
});
