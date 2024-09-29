const odbc = require('odbc');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Console } = require('console');

// Caminho padrão para o banco de dados Access
let dbPath = path.join(process.env.HOME || process.env.USERPROFILE, 'Documents', 'Banco', 'onboarding.accdb'); 

/**
 * Função para conectar ao banco de dados Access.
 *
 * Esta função estabelece uma conexão com um banco de dados Access usando ODBC.
 *
 * @async
 * @function connectToAccess
 * @returns {Promise<Object>} Retorna um objeto de conexão ao banco de dados.
 * @throws {Error} Lança um erro se a conexão falhar.
 */
async function connectToAccess() {
    // Adicione a sua senha aqui
    const password = 'Ideal#4900'; 
    const connectionString = `Driver={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=${dbPath};PWD=${password};`; // Inclua a senha na conexão
    try {
        const connection = await odbc.connect(connectionString);
        console.log('Conexão ao banco de dados Access foi bem-sucedida!');
        return connection; 
    } catch (error) {
        console.error('Erro ao conectar ao Access:', error);
        throw error; 
    }
}

/**
 * Função para executar uma consulta no banco de dados Access.
 *
 * @async
 * @function executeQuery
 * @param {string} query - A consulta SQL a ser executada.
 * @param {Array} [params=[]] - Parâmetros a serem utilizados na consulta.
 * @returns {Promise<Array>} Retorna os resultados da consulta.
 * @throws {Error} Lança um erro se a execução da consulta falhar.
 */
async function executeQuery(query, params = []) {
    const connection = await connectToAccess();
    try {
        const result = await connection.query(query, params);
        return result;
    } catch (error) {
        console.error('Erro ao executar a consulta:', error);
        throw error;
    } finally {
        await connection.close();
    }
}

/**
 * Função para escapar caracteres especiais e evitar injeções de SQL.
 *
 * @function sanitize
 * @param {string} value - O valor a ser sanitizado.
 * @returns {string} O valor sanitizado.
 */
function sanitize(value) {
    // Verifica se o valor é undefined ou null
    if (value === undefined || value === null) {
        return ''; // Retorna uma string vazia ou você pode escolher lançar um erro
    }
    return value.replace(/'/g, "''"); 
}

/**
 * Função para obter todos os clientes.
 *
 * @async
 * @function get_clientes
 * @returns {Promise<Array>} Retorna uma lista de todos os clientes.
 */
async function get_clientes() {
    const query = 'SELECT * FROM clientes'; 
    const resultados = await executeQuery(query);
    return resultados;
}

/**
 * Função para obter os detalhes de um cliente específico.
 *
 * @async
 * @function get_detalhes_cliente
 * @param {number} clienteId - O ID do cliente a ser buscado.
 * @returns {Promise<Object>} Retorna os detalhes do cliente.
 */
async function get_detalhes_cliente(clienteId) {
    const query = `SELECT * FROM clientes WHERE ID = ${parseInt(clienteId, 10)}`; 
    const resultados = await executeQuery(query);
    console.log(resultados);
    return resultados[0]; 
}

/**
 * Função para adicionar um arquivo ao banco de dados e copiá-lo para o diretório da empresa.
 *
 * @async
 * @function add_file
 * @param {string} caminhoArquivoOrigem - O caminho do arquivo de origem a ser adicionado.
 * @param {string} nomeArquivo - O nome do arquivo a ser salvo.
 * @param {Date} dataUpload - A data de upload do arquivo.
 * @param {number} idEmpresa - O ID da empresa associada ao arquivo.
 * @returns {Promise<Object>} Retorna um objeto com o status da operação.
 */
async function add_file(caminhoArquivoOrigem, nomeArquivo, dataUpload, idEmpresa) {
    try {
        console.log(`Adicionando arquivo: ${nomeArquivo}, Data: ${dataUpload}, ID Empresa: ${idEmpresa}`);

        const defaultDirectory = "C:\\Users\\edula\\Documents\\Banco";
        const empresaDirectory = path.join(defaultDirectory, idEmpresa.toString());

        // Cria diretório da empresa se não existir
        if (!fs.existsSync(empresaDirectory)) {
            fs.mkdirSync(empresaDirectory, { recursive: true });
            console.log(`Diretório ${empresaDirectory} criado com sucesso!`);
        } else {
            console.log(`Diretório ${empresaDirectory} já existe.`);
        }

        // Verifica se o arquivo de origem existe antes de copiar
        if (!fs.existsSync(caminhoArquivoOrigem)) {
            throw new Error(`Arquivo de origem não encontrado: ${caminhoArquivoOrigem}`);
        }

        const filePath = path.join(empresaDirectory, nomeArquivo);

        const formattedDataUpload = dataUpload.toISOString().slice(0, 19).replace('T', ' ');

        // Sanitiza as entradas para prevenir injeções de SQL
        const sanitizedFilePath = sanitize(filePath);
        const sanitizedFormattedDataUpload = sanitize(formattedDataUpload);
        const sanitizedIdEmpresa = idEmpresa; // Supondo que ID seja um número

        // Verificar se o arquivo já existe no banco de dados
        const checkQuery = `SELECT * FROM arquivos WHERE ARQUIVO = '${sanitizedFilePath}'`;
        const result = await executeQuery(checkQuery);

        if (result.length > 0) {
            console.log(`O arquivo ${nomeArquivo} já existe no banco de dados.`);
            return { success: true, message: 'O arquivo já existe no banco de dados e não foi criado um novo registro.' };
        }

        // Copia o arquivo de origem para o diretório da empresa
        fs.copyFileSync(caminhoArquivoOrigem, filePath);
        console.log(`Arquivo ${nomeArquivo} copiado com sucesso para ${filePath}`);

        // Insere o novo registro no banco de dados
        const insertQuery = `INSERT INTO arquivos (ARQUIVO, DATA_UPLOAD, ID_EMPRESA) VALUES ('${sanitizedFilePath}', '${sanitizedFormattedDataUpload}', ${sanitizedIdEmpresa})`;
        await executeQuery(insertQuery);
        console.log(`Arquivo ${nomeArquivo} registrado no banco de dados com sucesso!`);

        return { success: true, message: 'Arquivo adicionado com sucesso.' };

    } catch (error) {
        console.error('Erro ao adicionar arquivo:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Função para obter arquivos associados a uma empresa específica.
 *
 * @async
 * @function get_arquivos_por_empresa
 * @param {number} idEmpresa - O ID da empresa cujos arquivos serão buscados.
 * @returns {Promise<Array>} Retorna uma lista de arquivos associados à empresa.
 */
async function get_arquivos_por_empresa(idEmpresa) {
    if (!idEmpresa) {
        console.error('ID da empresa não fornecido');
        return [];
    }
    
    const query = `SELECT * FROM arquivos WHERE ID_EMPRESA = '${parseInt(idEmpresa)}'`; 
    const resultados = await executeQuery(query);
    console.log('Resultados da consulta:', resultados);
    return resultados;
}

/**
 * Função para abrir e executar um arquivo.
 *
 * @function abrirArquivo
 * @param {string} caminhoAbsoluto - O caminho absoluto do arquivo a ser aberto.
 * @returns {Promise<Object>} Retorna um objeto com o status da operação.
 */
function abrirArquivo(caminhoAbsoluto) {
    console.log(`Tentando abrir o arquivo: ${caminhoAbsoluto}`);
    return new Promise((resolve, reject) => {
        try {
            const formattedCaminho = `"${caminhoAbsoluto}"`;
            console.log(`Caminho formatado: ${formattedCaminho}`);
            console.log(`Arquivo existe: ${fs.existsSync(caminhoAbsoluto)}`);

            // Verifica se o arquivo existe
            if (fs.existsSync(caminhoAbsoluto)) {
                // Usa o comando start para abrir o arquivo
                exec(`start "" ${formattedCaminho}`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Erro ao executar o arquivo ${formattedCaminho}:`, error);
                        console.error(`Saída do stderr: ${stderr}`);
                        console.log(`Saída do stdout: ${stdout}`);
                        return reject({ success: false, message: `Erro ao executar o arquivo: ${stderr}` });
                    }
                    resolve({ success: true, message: `Arquivo ${formattedCaminho} aberto com sucesso!` });
                });
            } else {
                console.error(`Arquivo ${formattedCaminho} não encontrado.`);
                reject({ success: false, message: 'Arquivo não encontrado.' });
            }
        } catch (error) {
            console.error(`Erro ao abrir o arquivo ${caminhoAbsoluto}:`, error);
            reject({ success: false, message: 'Erro ao abrir o arquivo.' });
        }
    });
}

/**
 * Função para copiar um arquivo com base no ID do arquivo e o caminho de destino.
 *
 * @async
 * @function copy_file
 * @param {number} fileId - O ID do arquivo a ser copiado.
 * @param {string} caminhoDestino - O caminho onde o arquivo deve ser salvo.
 * @returns {Promise<Object>} Retorna um objeto com o status da operação.
 */
async function copy_file(fileId, caminhoDestino) {
    try {
        // Obtém os detalhes do arquivo com base no ID
        const query = `SELECT ARQUIVO FROM arquivos WHERE ID = ${parseInt(fileId)}`;
        const resultados = await executeQuery(query);

        // Verifica se o arquivo existe no banco de dados
        if (resultados.length === 0) {
            throw new Error(`Arquivo com ID ${fileId} não encontrado.`);
        }

        const caminhoOrigem = resultados[0].ARQUIVO;

        // Verifica se o arquivo de origem existe
        if (!fs.existsSync(caminhoOrigem)) {
            throw new Error(`Arquivo de origem não encontrado: ${caminhoOrigem}`);
        }

        // Cria o diretório de destino se não existir
        const destinoDiretorio = path.dirname(caminhoDestino);
        if (!fs.existsSync(destinoDiretorio)) {
            fs.mkdirSync(destinoDiretorio, { recursive: true });
            console.log(`Diretório ${destinoDiretorio} criado com sucesso!`);
        }

        // Copia o arquivo de origem para o destino
        fs.copyFileSync(caminhoOrigem, caminhoDestino);
        console.log(`Arquivo copiado de ${caminhoOrigem} para ${caminhoDestino} com sucesso!`);

        return { success: true, message: 'Arquivo copiado com sucesso.' };
    } catch (error) {
        console.error('Erro ao copiar arquivo:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Função para excluir um arquivo do banco de dados e do sistema de arquivos.
 *
 * @async
 * @function delete_file
 * @param {number} fileId - O ID do arquivo a ser excluído.
 * @returns {Promise<Object>} Retorna um objeto com o status da operação.
 */
async function delete_file(fileId) {
    try {
        // Obtém os detalhes do arquivo com base no ID
        const query = `SELECT ARQUIVO FROM arquivos WHERE ID = ${parseInt(fileId)}`;
        const resultados = await executeQuery(query);

        // Verifica se o arquivo existe no banco de dados
        if (resultados.length === 0) {
            throw new Error(`Arquivo com ID ${fileId} não encontrado.`);
        }

        const caminhoArquivo = resultados[0].ARQUIVO;

        // Verifica se o arquivo de origem existe
        if (fs.existsSync(caminhoArquivo)) {
            // Exclui o arquivo do sistema de arquivos
            fs.unlinkSync(caminhoArquivo);
            console.log(`Arquivo ${caminhoArquivo} excluído com sucesso!`);
        } else {
            console.warn(`Arquivo ${caminhoArquivo} não encontrado no sistema de arquivos.`);
        }

        // Exclui o registro do banco de dados
        const deleteQuery = `DELETE FROM arquivos WHERE ID = ${parseInt(fileId)}`;
        await executeQuery(deleteQuery);
        console.log(`Registro do arquivo com ID ${fileId} excluído do banco de dados com sucesso!`);

        return { success: true, message: 'Arquivo excluído com sucesso.' };

    } catch (error) {
        console.error('Erro ao excluir arquivo:', error);
        return { success: false, message: error.message };
    }
}

async function addCliente(cliente) {
    try {
        // Verifica se todos os campos necessários estão presentes e substitui vazios por "0" ou "-"
        const requiredFields = [
            'nome_empresa', 'cnpj', 'regime_tributario', 'inicio_responsabilidade', 
            'vl_honorarios', 'indicacao', 'vinculos', 
            'contato', 'email', 'perfil', 
            'grupo', 'contador_anterior', 'contato_contador_anterior', 'numero_empresa'
        ];

        // Itera sobre os campos e substitui os vazios
        for (const field of requiredFields) {
            if (cliente[field] === undefined || cliente[field] === null || cliente[field] === '') {
                // Para campos numéricos, armazene como "0", para strings como "-"
                if (['vl_honorarios', 'vinculos'].includes(field)) {
                    cliente[field] = 0;  // Usar 0 para campos numéricos
                } else {
                    cliente[field] = '-';  // Para campos de texto, usar "-"
                }
            }
        }

        // Sanitiza os valores do cliente
        const sanitizedValues = Object.fromEntries(
            Object.entries(cliente).map(([key, value]) => {
                if (typeof value === 'string') {
                    return [key, sanitize(value)]; // Sanitiza se for uma string
                }
                return [key, value]; // Retorna o valor como está se não for uma string
            })
        );

        console.log('Valores a serem inseridos:', sanitizedValues);

        // Cria a consulta de inserção
        const insertQuery = `
            INSERT INTO clientes (
                NOME_EMPRESA, CNPJ, TRIBUTACAO, INC_RESPONSABILIDADE,
                VLR_HONORARIO, INDICACAO, NMR_VINCULOS,
                CONTATO, EMAIL, PERFIL,
                GRUPO, CNT_ANTERIOR, CNT_CONTATO, NMR_QUESTOR
            ) VALUES (
                '${sanitizedValues.nome_empresa}',
                '${sanitizedValues.cnpj}',
                '${sanitizedValues.regime_tributario}',
                '${sanitizedValues.inicio_responsabilidade}',
                ${sanitizedValues.vl_honorarios},
                '${sanitizedValues.indicacao}',
                ${sanitizedValues.vinculos},
                '${sanitizedValues.contato}',
                '${sanitizedValues.email}',
                '${sanitizedValues.perfil}',
                '${sanitizedValues.grupo}',
                '${sanitizedValues.contador_anterior}',
                '${sanitizedValues.contato_contador_anterior}',
                ${sanitizedValues.numero_empresa}
            )
        `;

        console.log('Consulta SQL:', insertQuery);

        // Executa a consulta
        await executeQuery(insertQuery);
        console.log('Cliente adicionado com sucesso!');
        return { success: true, message: 'Cliente adicionado com sucesso!' };
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Função para logar um usuário.
 *
 * @async
 * @function login
 * @param {string} username - O nome de usuário para login.
 * @param {string} password - A senha para login.
 * @returns {Promise<Object>} Retorna um objeto com o status da operação e informações do usuário, se o login for bem-sucedido.
 */
async function login(username, password) {
    try {
        // Sanitiza os valores para prevenir injeções de SQL
        const sanitizedUsername = sanitize(username);
        const sanitizedPassword = sanitize(password);

        // Consulta SQL para verificar as credenciais do usuário
        const query = `
            SELECT * FROM usuarios 
            WHERE usuario = '${sanitizedUsername}' AND senha = '${sanitizedPassword}'
        `;

        const resultados = await executeQuery(query);

        // Verifica se o usuário foi encontrado
        if (resultados.length === 0) {
            return { success: false, message: 'Usuário ou senha inválidos.' };
        }

        // Retorna o usuário logado, incluindo o ID
        const usuario = resultados[0]; 
        return { success: true, message: 'Login bem-sucedido.', user: { id: usuario.ID, username: usuario.USUARIO } };

    } catch (error) {
        console.error('Erro ao tentar logar:', error);
        return { success: false, message: 'Erro ao tentar logar. Tente novamente mais tarde.' };
    }
}

/**
 * Função para excluir uma empresa do banco de dados pelo ID.
 *
 * @async
 * @function delete_empresa
 * @param {number} empresaId - O ID da empresa a ser excluída.
 * @returns {Promise<Object>} Retorna um objeto com o status da operação.
 */
async function delete_empresa(empresaId) {
    try {
        // Sanitiza o ID da empresa
        const sanitizedEmpresaId = parseInt(empresaId, 10);

        if (isNaN(sanitizedEmpresaId)) {
            throw new Error('ID da empresa inválido.');
        }

        // Exclui o registro da empresa do banco de dados
        const deleteQuery = `DELETE FROM clientes WHERE ID = ${sanitizedEmpresaId}`;
        await executeQuery(deleteQuery);
        console.log(`Empresa com ID ${sanitizedEmpresaId} excluída com sucesso do banco de dados.`);

        return { success: true, message: 'Empresa excluída com sucesso.' };
    } catch (error) {
        console.error('Erro ao excluir empresa:', error);
        return { success: false, message: error.message };
    }
}

async function updateCliente(cliente, clienteId) {
    try {
        // Lista de campos obrigatórios que serão atualizados
        const requiredFields = [
            'nome_empresa', 'cnpj', 'regime_tributario', 'inicio_responsabilidade', 
            'vl_honorarios', 'indicacao', 'vinculos', 
            'contato', 'email', 'perfil', 
            'grupo', 'contador_anterior', 'contato_contador_anterior', 'numero_empresa'
        ];

        // Itera sobre os campos obrigatórios e preenche valores padrão quando necessário
        for (const field of requiredFields) {
            if (cliente[field] === undefined || cliente[field] === null || cliente[field] === '') {
                // Para campos numéricos, preenche com 0, para strings com "-"
                if (['vl_honorarios', 'vinculos', 'numero_empresa'].includes(field)) {
                    cliente[field] = 0;
                } else {
                    cliente[field] = '-';
                }
            }
        }

        // Sanitiza os valores do cliente
        const sanitizedValuesEdit = Object.fromEntries(
            Object.entries(cliente).map(([key, value]) => {
                if (typeof value === 'string') {
                    return [key, sanitize(value)]; 
                }
                return [key, value]; 
            })
        );

        console.log('Valores a serem atualizados:', sanitizedValuesEdit);

        // Cria a consulta SQL para atualizar os dados na tabela "clientes"
        const updateQuery = `
            UPDATE clientes
            SET 
                NOME_EMPRESA = '${sanitizedValuesEdit.NOME_EMPRESA || sanitizedValuesEdit.nome_empresa}',
                CNPJ = '${sanitizedValuesEdit.CNPJ || sanitizedValuesEdit.cnpj}',
                TRIBUTACAO = '${sanitizedValuesEdit.TRIBUTACAO || sanitizedValuesEdit.regime_tributario}',
                INC_RESPONSABILIDADE = '${sanitizedValuesEdit.INICIO_REPONSABILIDADE || sanitizedValuesEdit.inicio_responsabilidade}',
                VLR_HONORARIO = ${sanitizedValuesEdit.HONORARIOS || sanitizedValuesEdit.vl_honorarios},
                INDICACAO = '${sanitizedValuesEdit.INDICACAO || sanitizedValuesEdit.indicacao}',
                NMR_VINCULOS = ${sanitizedValuesEdit.VINCULOS || sanitizedValuesEdit.vinculos},
                CONTATO = '${sanitizedValuesEdit.CONTATO || sanitizedValuesEdit.contato}',
                EMAIL = '${sanitizedValuesEdit.EMAIL || sanitizedValuesEdit.email}',
                PERFIL = '${sanitizedValuesEdit.PERFIL || sanitizedValuesEdit.perfil}',
                GRUPO = '${sanitizedValuesEdit.GRUPO || sanitizedValuesEdit.grupo}',
                CNT_ANTERIOR = '${sanitizedValuesEdit.CONTADOR_ANTERIOR || sanitizedValuesEdit.contador_anterior}',
                CNT_CONTATO = '${sanitizedValuesEdit.CONTATO_CONTADOR_ANTERIOR || sanitizedValuesEdit.contato_contador_anterior}',
                NMR_QUESTOR = ${sanitizedValuesEdit.NMR_QUESTOR || sanitizedValuesEdit.numero_empresa} 
            WHERE id = ${clienteId}
        `;

        console.log('Consulta SQL para atualização:', updateQuery);

        // Executa a consulta de atualização
        await executeQuery(updateQuery);
        console.log('Cliente atualizado com sucesso!');
        return { success: true, message: 'Cliente atualizado com sucesso!' };
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        return { success: false, message: error.message };
    }
}

// Exportação das funções para uso em outros módulos
module.exports = {
    connectToAccess,
    executeQuery,
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
};
