// Importa módulos do Electron e outras bibliotecas
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const axios = require('axios');
const { google } = require('googleapis');

// Importa funções do módulo de banco de dados
const dbFunctions = require('./src/resources/backend/database');
const {
    get_clientes,
    get_detalhes_cliente,
    add_file,
    get_arquivos_por_empresa,
    abrirArquivo,
    copy_file,
    delete_file,
    addCliente,
    login,
    delete_empresa,
    updateCliente
} = dbFunctions;

// Variáveis para a instância da janela e configuração da API
let mainWindow;
const API_KEY = 'AIzaSyCUvlaC7H4aya2wN4NLh5-ujulZzU0NZrA'; 
const SPREADSHEET_ID = '13_wPRAMDqpK5DIGFXWc4kPVseo5Lh8shmpxEr2GW8x8';
const RANGE = 'Status!A1:A1';
const defaultDirectory = "C:\\Users\\edula\\Documents\\Banco";

// Função para verificar se a aplicação está ativa na planilha do Google Sheets
async function verificarAtivo() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    try {
        const { data } = await axios.get(url);
        return data.values && data.values.length > 0 ? data.values[0][0] === 'Ativo' : false;
    } catch (error) {
        console.error('Erro ao verificar status na planilha:', error.response?.data || error.message);
        return false;
    }
}

// Função para criar a janela principal da aplicação
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'src/resources/images/icon.png')
    });
    mainWindow.loadFile('src/index.html');
    mainWindow.maximize();
}

// Evento quando a aplicação está pronta
app.on('ready', async () => {
    try {
        if (await verificarAtivo()) {
            createWindow();
            mainWindow.webContents.on('did-finish-load', () => {
                mainWindow.webContents.send('set-directory', defaultDirectory);
            });
        } else {
            console.log('A aplicação não está ativa. Verifique o status na planilha do Google Sheets.');
            app.quit();
        }
    } catch (error) {
        console.error('Erro ao verificar status:', error.message);
        app.quit();
    }
});

// Manipuladores IPC
ipcMain.handle('set-default-directory', () => defaultDirectory);
ipcMain.handle('get-clientes', async () => await get_clientes());
ipcMain.handle('get-detalhes-cliente', async (event, clienteId) => await get_detalhes_cliente(clienteId));
ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Arquivos', extensions: ['*'] }] });
    return result.filePaths;
});
ipcMain.handle('add-file', async (event, caminhoArquivoOrigem, dataUpload, idEmpresa) => {
    try {
        return await add_file(caminhoArquivoOrigem, path.basename(caminhoArquivoOrigem), new Date(dataUpload), idEmpresa);
    } catch (error) {
        console.error('Erro ao adicionar arquivo:', error.message);
        return { success: false, message: 'Erro ao adicionar arquivo.' };
    }
});
ipcMain.handle('get-arquivos-por-empresa', async (event, idEmpresa) => {
    try {
        const arquivos = await get_arquivos_por_empresa(idEmpresa); 
        return { success: true, arquivos }; 
    } catch (error) {
        console.error('Erro ao obter arquivos da empresa:', error); 
        return { success: false, message: error.message }; 
    }
});
ipcMain.handle('abrir-arquivo', async (event, caminhoAbsoluto) => {
    try {
        return await abrirArquivo(caminhoAbsoluto);
    } catch (error) {
        console.error('Erro ao abrir arquivo:', error.message);
        return { success: false, message: 'Erro ao abrir o arquivo.' };
    }
});
ipcMain.handle('copy-file', async (event, idArquivo, caminhoDestino) => await copy_file(idArquivo, caminhoDestino));
ipcMain.handle('escolher-caminho-salvar', async (event, nomeArquivo) => {
    const result = await dialog.showSaveDialog({ title: 'Salvar arquivo', defaultPath: nomeArquivo, buttonLabel: 'Salvar', filters: [{ name: 'Arquivos', extensions: ['*'] }] });
    return result.filePath;
});
ipcMain.handle('delete-file', async (event, fileId) => {
    try {
        return await delete_file(fileId);
    } catch (error) {
        console.error('Erro ao excluir arquivo:', error.message);
        return { success: false, message: error.message };
    }
});
ipcMain.handle('add-cliente', async (event, clienteData) => await addCliente(clienteData));
ipcMain.handle('fazer-login', async (event, { username, password }) => await login(username, password));
ipcMain.handle('delete-empresa', async (event, empresaId) => {
    try {
        return { success: true, data: await delete_empresa(empresaId) };
    } catch (error) {
        console.error('Erro ao excluir empresa:', error.message);
        return { success: false, message: error.message };
    }
});
ipcMain.handle('update-cliente', async (event, clienteData, clienteId) => await updateCliente(clienteData, clienteId));
