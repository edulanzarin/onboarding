const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel, ...args) => {
        const validChannels = [
            'get-clientes',
            'get-detalhes-cliente',
            'open-clientes-window',
            'add-file', 
            'get-arquivos-por-empresa',
            'abrir-arquivo',
            'open-file-dialog',
            'baixar-arquivo',
            'copy-file',
            'escolher-caminho-salvar',
            'delete-file',
            'add-cliente',
            'fazer-login',
            'delete-empresa',
            'update-cliente'
        ];
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
    },
});

// Receber o diretório padrão e armazená-lo no localStorage
ipcRenderer.on('set-directory', (event, directory) => {
    localStorage.setItem('selectedDirectory', directory); 
});
