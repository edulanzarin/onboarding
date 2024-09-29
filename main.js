// Importa os módulos necessários do Electron
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

// Importa funções do módulo de banco de dados
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
} = require('./src/resources/backend/database');

// Variável para armazenar a instância da janela principal
let mainWindow;

// Define o diretório padrão onde os arquivos serão armazenados
const defaultDirectory = "C:\\Users\\edula\\Documents\\Banco";

// Função para criar a janela principal da aplicação
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800, // Largura da janela
        height: 600, // Altura da janela
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Carrega o script de pré-carregamento
            contextIsolation: true, // Ativa a isolação de contexto
            enableRemoteModule: false, // Desabilita o módulo remoto
            nodeIntegration: false, // Desabilita a integração do Node.js
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'src/resources/images/icon.png')
    });

    mainWindow.loadFile('src/index.html'); // Carrega o arquivo HTML principal
    mainWindow.maximize(); // Maximiza a janela ao ser criada
}

// Manipulador IPC para definir o diretório padrão no localStorage
ipcMain.handle('set-default-directory', () => {
    return defaultDirectory; // Retorna o diretório padrão
});

// Evento quando a aplicação está pronta
app.on('ready', () => {
    createWindow(); // Cria a janela principal

    // Define o diretório padrão no localStorage após a janela carregar
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('set-directory', defaultDirectory);
    });
});

// Manipulador IPC para obter a lista de clientes
ipcMain.handle('get-clientes', async () => {
    try {
        return await get_clientes(); // Retorna a lista de clientes
    } catch (error) {
        console.error('Erro ao obter clientes:', error); // Registra o erro no console
        throw error; // Lança o erro
    }
});

// Manipulador IPC para obter os detalhes de um cliente específico
ipcMain.handle('get-detalhes-cliente', async (event, clienteId) => {
    try {
        return await get_detalhes_cliente(clienteId); // Retorna os detalhes do cliente
    } catch (error) {
        console.error('Erro ao obter detalhes do cliente:', error); // Registra o erro
        throw error; // Lança o erro
    }
});

// Manipulador IPC para abrir um diálogo de seleção de arquivos
ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'], // Permite selecionar arquivos
        filters: [
            { name: 'Arquivos', extensions: ['*'] } // Filtros para tipos de arquivos
        ]
    });

    console.log('Caminhos dos arquivos selecionados:', result.filePaths); // Registra os caminhos dos arquivos selecionados
    return result.filePaths; // Retorna os caminhos dos arquivos selecionados
});

// Manipulador IPC para adicionar um arquivo ao banco de dados
ipcMain.handle('add-file', async (event, caminhoArquivoOrigem, dataUpload, idEmpresa) => {
    try {
        console.log(`Parâmetros recebidos: ${caminhoArquivoOrigem}, ${dataUpload}, ${idEmpresa}`); // Registra os parâmetros recebidos
        const result = await add_file(caminhoArquivoOrigem, path.basename(caminhoArquivoOrigem), new Date(dataUpload), idEmpresa); 
        return result; // Retorna o resultado da função add_file
    } catch (error) {
        console.error('Erro ao adicionar arquivo:', error); // Registra o erro
        return { success: false, message: 'Erro ao adicionar arquivo.' }; // Retorna mensagem de erro
    }
});

// Manipulador IPC para obter arquivos de uma empresa específica
ipcMain.handle('get-arquivos-por-empresa', async (event, idEmpresa) => {
    try {
        const arquivos = await get_arquivos_por_empresa(idEmpresa); 
        return { success: true, arquivos }; // Retorna arquivos da empresa
    } catch (error) {
        console.error('Erro ao obter arquivos da empresa:', error); // Registra o erro
        throw error; // Lança o erro
    }
});

// Manipulador IPC para abrir e executar um arquivo
ipcMain.handle('abrir-arquivo', async (event, caminhoAbsoluto) => {
    console.log(`Solicitação para abrir arquivo: ${caminhoAbsoluto}`); // Registra a solicitação
    try {
        const resultado = await abrirArquivo(caminhoAbsoluto); // Tenta abrir o arquivo
        return resultado; // Retorna o resultado da operação
    } catch (error) {
        console.error('Erro ao abrir arquivo:', error); // Registra o erro
        return { success: false, message: 'Erro ao abrir o arquivo.' }; // Retorna mensagem de erro
    }
});

// Manipulador de IPC para copiar arquivo
ipcMain.handle('copy-file', async (event, idArquivo, caminhoDestino) => {
    const resultado = await copy_file(idArquivo, caminhoDestino);
    return resultado;
});

// Manipulador IPC para escolher o caminho de salvar
ipcMain.handle('escolher-caminho-salvar', async (event, nomeArquivo) => {
    const result = await dialog.showSaveDialog({
        title: 'Salvar arquivo',
        defaultPath: nomeArquivo, // Usar nomeArquivo aqui
        buttonLabel: 'Salvar',
        filters: [
            { name: 'Arquivos', extensions: ['*'] } 
        ]
    });
    
    return result.filePath;
});

// Manipulador IPC para excluir um arquivo
ipcMain.handle('delete-file', async (event, fileId) => {
    try {
        const resultado = await delete_file(fileId); // Chama a função delete_file
        return resultado; // Retorna o resultado da operação
    } catch (error) {
        console.error('Erro ao excluir arquivo:', error); // Registra o erro
        return { success: false, message: error.message }; // Retorna a mensagem de erro
    }
});

// Evento IPC para adicionar um cliente
ipcMain.handle('add-cliente', async (event, clienteData) => {
    try {
        const result = await addCliente(clienteData); // Chame a função addCliente com os dados do cliente
        return result; // Retorne o resultado para o processo de renderização
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        throw new Error('Erro ao adicionar cliente: ' + error.message);
    }
});

// Evento IPC para login
ipcMain.handle('fazer-login', async (event, { username, password }) => {
    try {
        const isAuthenticated = await login(username, password);
        return isAuthenticated; // Retorna o resultado completo da função login
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        throw new Error('Erro ao fazer login: ' + error.message);
    }
});

// Manipulador IPC para excluir uma empresa
ipcMain.handle('delete-empresa', async (event, empresaId) => {
    try {
        const resultado = await delete_empresa(empresaId); // Chama a função delete_empresa
        return { success: true, data: resultado }; // Retorna o resultado da operação
    } catch (error) {
        console.error('Erro ao excluir empresa:', error); // Registra o erro
        return { success: false, message: error.message }; // Retorna a mensagem de erro
    }
});

// Evento IPC para atualizar um cliente
ipcMain.handle('update-cliente', async (event, clienteData, clienteId) => {
    try {
        const result = await updateCliente(clienteData, clienteId); 
        return result; // Retorne o resultado para o processo de renderização
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        throw new Error('Erro ao atualizar cliente: ' + error.message);
    }
});
