// Função para alternar a exibição dos filtros
function toggleFiltros() {
    const content = document.getElementById("filtros-content");
    content.style.display = content.style.display === "block" ? "none" : "block";
}

// Função para definir a cor do perfil com base no tipo de perfil
const getPerfilColor = (perfil) => {
    switch (perfil.toLowerCase()) {
        case 'bronze':
            return 'brown'; 
        case 'prata':
            return 'rgb(170, 170, 170)'; 
        case 'ouro':
            return 'goldenrod';
        case 'diamante':
            return 'deepskyblue'; 
        default:
            return 'black'; 
    }
};

// Função para definir a cor clara do regime tributário (background)
const getTributacaoColor = (tributacao) => {
    switch (tributacao.toLowerCase()) {
        case 'simples nacional':
            return 'lightgreen'; 
        case 'lucro presumido':
            return 'lightblue'; 
        case 'lucro real':
            return '#f8d7da'; 
        case 'mei':
            return 'rgb(226, 195, 226)'; 
        default:
            return '#f1f1f1'; 
    }
};

// Função para definir a cor do texto do regime tributário (texto)
const getTributacaoTextColor = (tributacao) => {
    switch (tributacao.toLowerCase()) {
        case 'simples nacional':
            return '#155724'; 
        case 'lucro presumido':
            return '#004085'; 
        case 'lucro real':
            return '#721c24'; 
        case 'mei':
            return 'purple'; 
        default:
            return '#333333';
    }
};

async function loadClientes(filters = {}) {
    try {
        const clientes = await window.electron.invoke('get-clientes');

        const filteredClientes = clientes.filter(cliente => {
            const matchesNmrQuestor = !filters.nmrQuestor || cliente.NMR_QUESTOR?.toString().includes(filters.nmrQuestor);
            const matchesNome = !filters.nome || cliente.NOME_EMPRESA?.toLowerCase().includes(filters.nome.toLowerCase());
            const matchesCnpj = !filters.cnpj || cliente.CNPJ?.includes(filters.cnpj);
            return matchesNmrQuestor && matchesNome && matchesCnpj;
        });

        const listaClientes = document.getElementById('lista-clientes');
        listaClientes.innerHTML = '';

        filteredClientes.forEach(cliente => {
            const perfilColor = getPerfilColor(cliente.PERFIL || '');
            const tributacaoBackgroundColor = getTributacaoColor(cliente.TRIBUTACAO || '');
            const tributacaoTextColor = getTributacaoTextColor(cliente.TRIBUTACAO || '');

            let imgSrc = '';
            switch (cliente.PERFIL?.toLowerCase()) {
                case 'bronze':
                    imgSrc = 'resources/images/bronze.png';
                    break;
                case 'prata':
                    imgSrc = 'resources/images/prata.png';
                    break;
                case 'ouro':
                    imgSrc = 'resources/images/ouro.png';
                    break;
                case 'diamante':
                    imgSrc = 'resources/images/diamante.png';
                    break;
                default:
                    imgSrc = 'resources/images/default.png'; 
            }

            const clienteCard = document.createElement('div');
            clienteCard.classList.add('cliente-card');
            clienteCard.dataset.id = cliente.ID;
            clienteCard.style.backgroundColor = tributacaoBackgroundColor; 
            clienteCard.style.color = tributacaoTextColor; 
            
            clienteCard.innerHTML = `
                <div class="card-left-side">
                    <img src="${imgSrc}" alt="${cliente.PERFIL}" class="card-image" />
                </div>
                <div class="card-right-side">
                    <div class="card-header">
                        <p class="row-1">
                            <span class="card-numero">${cliente['NMR_QUESTOR'] || ''}</span>
                            <span class="card-nome">${cliente.NOME_EMPRESA || 'Nome não disponível'}</span>
                        </p>
                        <span class="card-actions">
                            <i class="fas fa-edit edit-icon" title="Editar"></i>
                            <i class="fas fa-trash delete-icon" title="Apagar"></i>
                        </span>
                    </div>
                    <p class="row-2">
                        <span class="card-cnpj">${cliente.CNPJ || 'CNPJ não disponível'}</span>
                    </p>
                    <div class="row-3">
                        <span class="perfil" style="color: ${perfilColor};">${cliente.PERFIL || 'Perfil não disponível'}</span>
                        <span class="tributacao" style="color: ${tributacaoTextColor};">${cliente.TRIBUTACAO || 'Tributação não disponível'}</span>
                    </div>
                </div>
            `;
            listaClientes.appendChild(clienteCard);

            // Evento para editar cliente
            clienteCard.querySelector('.edit-icon').addEventListener('click', (event) => {
                event.stopPropagation(); // Impede a propagação do evento
                handleEditOrDelete(cliente, 'edit');
            });

            // Evento para deletar cliente
            clienteCard.querySelector('.delete-icon').addEventListener('click', (event) => {
                event.stopPropagation(); // Impede a propagação do evento
                handleEditOrDelete(cliente, 'delete');
            });

            function handleEditOrDelete(cliente, action) {
                const userId = sessionStorage.getItem('userId'); // Verifica se existe um userId no sessionStorage

                if (!userId) {
                    createNotification("É necessário autenticar para editar ou excluir empresas.", 'salmon', 'red')
                    return; // Não faz nada
                }

                // Se userId existir, prossegue com a ação apropriada
                if (action === 'edit') {
                    editCliente(cliente);
                } else if (action === 'delete') {
                    deleteCliente(cliente);
                }
            }
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

function deleteCliente(cliente) {
    // Atualiza a mensagem do modal com o nome da empresa
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.textContent = `Você tem certeza que deseja excluir a empresa "${cliente.NOME_EMPRESA}"?`;

    // Mostra o modal
    const modal = document.getElementById('deleteModal');
    modal.style.display = "block";

    // Evento para confirmar a exclusão
    const confirmButton = document.getElementById('confirmDelete');
    confirmButton.onclick = async () => {
        const resultado = await window.electron.invoke('delete-empresa', cliente.ID);
        
        if (resultado.success) {
            console.log(`Empresa ${cliente.NOME_EMPRESA} excluída com sucesso.`);
            loadClientes(); 
        } else {
            console.error('Erro ao excluir empresa:', resultado.message);
        }
        
        // Fecha o modal
        modal.style.display = "none";
    };

    // Evento para cancelar a exclusão
    const cancelButton = document.getElementById('cancelDelete');
    cancelButton.onclick = () => {
        modal.style.display = "none"; 
    };

    // Evento para fechar o modal ao clicar no "x"
    const closeModal = document.getElementById('closeModal');
    closeModal.onclick = () => {
        modal.style.display = "none"; 
    };

    // Fecha o modal ao clicar fora dele
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = "none"; 
        }
    };
}

// Função para editar cliente
function editCliente(cliente) {
    const formHTML = getFormHTMLEdit(); 
    const formContainer = document.getElementById('detalhes-cliente');
    // Adiciona o HTML do formulário no contêiner
    formContainer.innerHTML = formHTML;

    // Preenche os campos do formulário com os dados do cliente
    const numeroEmpresaInput = document.getElementById('detalheNumeroEmpresa');
    const cnpjInput = document.getElementById('detalheCNPJ');
    const perfilInput = document.getElementById('detalhePerfil');
    const nomeEmpresaInput = document.getElementById('detalheNomeEmpresa');
    const grupoInput = document.getElementById('detalheGrupo');
    const regimeTributarioInput = document.getElementById('detalheRegimeTributario');
    const inicioResponsabilidadeInput = document.getElementById('detalheInicioResponsabilidade');
    const honorariosInput = document.getElementById('detalheHonorarios');
    const indicacaoInput = document.getElementById('detalheIndicacao');
    const vinculosInput = document.getElementById('detalheVinculos');
    const contatoInput = document.getElementById('detalheContato');
    const emailInput = document.getElementById('detalheEmail');
    const contadorAnteriorInput = document.getElementById('detalheContadorAnterior');
    const contatoContadorAnteriorInput = document.getElementById('detalheContatoContadorAnterior');

    // Preenche os campos com os dados do cliente
    numeroEmpresaInput.value = cliente.NMR_QUESTOR || '';
    cnpjInput.value = cliente.CNPJ || '';
    perfilInput.value = cliente.PERFIL || 'Bronze'; 
    nomeEmpresaInput.value = cliente.NOME_EMPRESA || '';
    grupoInput.value = cliente.GRUPO || '';
    regimeTributarioInput.value = cliente.TRIBUTACAO || 'MEI'; // Define um padrão
    inicioResponsabilidadeInput.value = cliente.INICIO_RESPONSABILIDADE || '';
    honorariosInput.value = cliente.HONORARIOS || '';
    indicacaoInput.value = cliente.INDICACAO || '';
    vinculosInput.value = cliente.VINCULOS || '';
    contatoInput.value = cliente.CONTATO || '';
    emailInput.value = cliente.EMAIL || '';
    contadorAnteriorInput.value = cliente.CONTADOR_ANTERIOR || '';
    contatoContadorAnteriorInput.value = cliente.CONTATO_CONTADOR_ANTERIOR || '';

    // Atualiza o botão de adicionar para editar
    const botaoAdicionar = document.getElementById('botaoAdicionar');
    botaoAdicionar.textContent = 'Editar';

    // Adiciona um evento ao botão Editar
    botaoAdicionar.onclick = async () => {
        const updatedCliente = {
            NMR_QUESTOR: numeroEmpresaInput.value,
            CNPJ: cnpjInput.value,
            PERFIL: perfilInput.value,
            NOME_EMPRESA: nomeEmpresaInput.value,
            GRUPO: grupoInput.value,
            TRIBUTACAO: regimeTributarioInput.value,
            INICIO_RESPONSABILIDADE: inicioResponsabilidadeInput.value,
            HONORARIOS: honorariosInput.value,
            INDICACAO: indicacaoInput.value,
            VINCULOS: vinculosInput.value,
            CONTATO: contatoInput.value,
            EMAIL: emailInput.value,
            CONTADOR_ANTERIOR: contadorAnteriorInput.value,
            CONTATO_CONTADOR_ANTERIOR: contatoContadorAnteriorInput.value
        };

        const resultado = await window.electron.invoke('update-cliente', updatedCliente, cliente.ID);
        
        if (resultado.success) {
            console.log(`Cliente ${cliente.NOME_EMPRESA} atualizado com sucesso.`);
            loadClientes(); 
            formContainer.innerHTML = ''; 
        } else {
            console.error('Erro ao atualizar cliente:', resultado.message);
        }
    };
}

// Função para filtrar clientes
function filtrarClientes() {
    const nmrQuestor = document.getElementById('nmr_questor').value;
    const nome = document.getElementById('nome').value;
    const cnpj = document.getElementById('cnpj').value;

    loadClientes({ nmrQuestor, nome, cnpj }); 
}

// Função para criar a seção de upload de arquivos
function createFileUploadSection() {
    const fileSection = document.createElement('div');
    fileSection.classList.add('file-section');

    const fileColumnUpload = document.createElement('div');
    fileColumnUpload.classList.add('file-column');

    const fileUploadContainer = document.createElement('div');
    fileUploadContainer.classList.add('file-upload-container');
    fileUploadContainer.id = 'file-upload-container';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.classList.add('file-input');
    fileInput.id = 'file-upload';
    fileInput.style.display = 'none';

    const uploadButton = document.createElement('button');
    uploadButton.id = 'upload-button';
    uploadButton.classList.add('upload-btn');
    uploadButton.textContent = 'Adicionar Arquivo';

    const uploadText = document.createElement('p');
    uploadText.classList.add('upload-text');
    uploadText.textContent = 'Selecione um arquivo para fazer o upload';

    fileUploadContainer.appendChild(fileInput);
    fileUploadContainer.appendChild(uploadButton);
    fileUploadContainer.appendChild(uploadText);

    fileColumnUpload.appendChild(fileUploadContainer);
    fileSection.appendChild(fileColumnUpload);

    // Criação da coluna para listar os arquivos
    const fileColumnList = document.createElement('div');
    fileColumnList.classList.add('file-column', 'file-list-container');

    const fileCardList = document.createElement('div');
    fileCardList.id = 'file-card-list';
    fileCardList.classList.add('file-card-list');

    fileColumnList.appendChild(fileCardList);
    fileSection.appendChild(fileColumnList);

    return fileSection;
}

// Função para criar e adicionar HTML dinamicamente
function renderizarDetalhesCliente(clienteDetalhes) {
    const detalhesContainer = document.getElementById('detalhes-cliente');
    
    // Limpa o conteúdo anterior
    detalhesContainer.innerHTML = '';

    // Cria o HTML dinamicamente
    const html = `
        <h2 class="empresa-title">Dados da Empresa</h2>
        <form id="form-detalhes" class="formulario-detalhes">
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheNumeroEmpresa" class="input-label">Número da Empresa</label>
                    <input type="text" id="detalheNumeroEmpresa">
                </div>
                <div class="form-column">
                    <label for="detalheCNPJ" class="input-label">CNPJ</label>
                    <input type="text" id="detalheCNPJ">
                </div>
                <div class="form-column">
                    <label for="detalhePerfil" class="input-label">Perfil</label>
                    <input type="text" id="detalhePerfil">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column large">
                    <label for="detalheNomeEmpresa" class="input-label">Razão Social</label>
                    <input type="text" id="detalheNomeEmpresa" readonly>
                </div>
                <div class="form-column small">
                    <label for="detalheGrupo" class="input-label">Grupo</label>
                    <input type="text" id="detalheGrupo" readonly>
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheRegimeTributario" class="input-label">Regime Tributário</label>
                    <input type="text" id="detalheRegimeTributario" readonly>
                </div>
                <div class="form-column">
                    <label for="detalheInicioResponsabilidade" class="input-label">Início</label>
                    <input type="text" id="detalheInicioResponsabilidade" readonly>
                </div>
                <div class="form-column">
                    <label for="detalheHonorarios" class="input-label">Valor dos Honorários</label>
                    <input type="text" id="detalheHonorarios" readonly>
                </div>
            </div>
            <div class="form-row">
                <div class="form-column large">
                    <label for="detalheIndicacao" class="input-label">Indicação</label>
                    <input type="text" id="detalheIndicacao" readonly>
                </div>
                <div class="form-column small">
                    <label for="detalheVinculos" class="input-label">Número de Vínculos Ativos</label>
                    <input type="text" id="detalheVinculos" readonly>
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheContato" class="input-label">Contato</label>
                    <input type="text" id="detalheContato" readonly>
                </div>
                <div class="form-column">
                    <label for="detalheEmail" class="input-label">Email</label>
                    <input type="text" id="detalheEmail" readonly>
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheContadorAnterior" class="input-label">Contador Anterior</label>
                    <input type="text" id="detalheContadorAnterior" readonly>
                </div>
                <div class="form-column">
                    <label for="detalheContatoContadorAnterior" class="input-label">Contato Contador Anterior</label>
                    <input type="text" id="detalheContatoContadorAnterior" readonly>
                </div>
            </div>
        </form>
        <h2 class="arquivos-title">Arquivos da Empresa</h2>
        <div class="file-section">
            <div class="file-column">
                <div class="file-upload-container" id="file-upload-container">
                    <input type="file" class="file-input" id="file-upload" style="display: none;" />
                    <button id="upload-button" class="upload-btn">Adicionar Arquivo</button>
                    <p class="upload-text">Selecione um arquivo para fazer o upload</p>
                </div>
            </div>
            <div class="file-column file-list-container">
                <div class="file-card-list" id="file-card-list">
                    <!-- Cards de arquivos -->
                </div>
            </div>
        </div>
    `;

    // Adiciona o HTML gerado ao container
    detalhesContainer.innerHTML = html;

    // Preenche os inputs com os dados do cliente
    document.getElementById('detalheNumeroEmpresa').value = clienteDetalhes['NMR-QUESTOR'] || '';
    document.getElementById('detalheCNPJ').value = clienteDetalhes.CNPJ || '';
    document.getElementById('detalhePerfil').value = clienteDetalhes.PERFIL || '';
    document.getElementById('detalheNomeEmpresa').value = clienteDetalhes.NOME_EMPRESA || '';
    document.getElementById('detalheGrupo').value = clienteDetalhes.GRUPO || '';
    document.getElementById('detalheRegimeTributario').value = clienteDetalhes.TRIBUTACAO || '';
    document.getElementById('detalheInicioResponsabilidade').value = clienteDetalhes.INC_RESPONSABILIDADE || '';
    document.getElementById('detalheHonorarios').value = clienteDetalhes.VLR_HONORARIO || '';
    document.getElementById('detalheIndicacao').value = clienteDetalhes.INDICACAO || '';
    document.getElementById('detalheVinculos').value = clienteDetalhes['NMR_VINCULOS'] || '';  
    document.getElementById('detalheContato').value = clienteDetalhes.CONTATO || '';
    document.getElementById('detalheEmail').value = clienteDetalhes.EMAIL || '';
    document.getElementById('detalheContadorAnterior').value = clienteDetalhes.CNT_ANTERIOR || '';
    document.getElementById('detalheContatoContadorAnterior').value = clienteDetalhes.CNT_CONTATO || '';

    // Adiciona um evento de mudança ao input de arquivo
    document.getElementById('file-upload').addEventListener('change', async (event) => {
        const filePaths = Array.from(event.target.files).map(file => file.path); 
        if (filePaths.length > 0) {
            await uploadFile(filePaths); 
        }
    });

    // Event listener para abrir o dialog de seleção de arquivos
    document.getElementById('upload-button').addEventListener('click', function () {
        // Verifica se o userId está no sessionStorage
        const userId = sessionStorage.getItem('userId');

        if (!userId) {
            createNotification("É necessário autenticar para adicionar um arquivo.", 'salmon', 'red');
        } else {
            uploadFile();
        }
    });
}

// Event listener para exibir detalhes do cliente ao clicar em um cartão
document.getElementById('lista-clientes').addEventListener('click', async (event) => {
    const clienteCard = event.target.closest('.cliente-card');

    if (clienteCard) {
        // Remove a seleção de todos os cartões e adiciona ao cartão clicado
        document.querySelectorAll('.cliente-card').forEach(card => card.classList.remove('selected'));
        clienteCard.classList.add('selected');

        const clienteId = clienteCard.dataset.id;
        console.log("ID do cliente clicado:", clienteId);

        currentEmpresaId = clienteId; 

        // Faz uma nova consulta para buscar os detalhes do cliente
        try {
            const clienteDetalhes = await window.electron.invoke('get-detalhes-cliente', clienteId);
            console.log(clienteDetalhes);

            if (clienteDetalhes) {
                // Chama a função para renderizar detalhes do cliente
                renderizarDetalhesCliente(clienteDetalhes);
                // Carrega os arquivos do cliente
                loadArquivos(clienteId);
            } else {
                alert('Detalhes do cliente não encontrados.');
            }
        } catch (error) {
            console.error('Erro ao obter detalhes do cliente:', error);
            alert('Erro ao carregar detalhes do cliente.');
        }
    }
});

// Função para obter a cor de fundo com base na extensão do arquivo
const getBackgroundColor = (extensao) => {
    switch (extensao.toLowerCase()) {
        case 'csv':
        case 'xlsx':
        case 'xls':
        case 'xlsm':
        case 'xlsb':
            return 'lightgreen'; 
        case 'doc':
        case 'docx':
            return 'lightblue'; 
        case 'txt':
            return 'lightgray';
        case 'pdf':
            return 'lightcoral'; 
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'bmp':
        case 'svg':
            return '#FFAEFF'; 
        case 'html':
        case 'css':
        case 'js':
        case 'xml':
            return '#ffcc80';
        case 'pfx':
        case 'zip':
        case 'rar':
        case '7z':
            return '#FDFD98'; 
        case 'mp3':
        case 'wav':
        case 'flac':
        case 'ogg':
            return '#FFC300'; 
        case 'mp4':
        case 'avi':
        case 'mov':
        case 'mkv':
            return '#00CED1'; 
        case 'psd':
        case 'ai':
        case 'xd':
        case 'fig':
            return '#FFD700'; 
        default:
            return '#f7f7f7'; 
    }
};

// Função para escurecer uma cor
const darkenColor = (color) => {
    const colors = {
        'lightgreen': 'green',
        'lightblue': 'blue',
        'lightcoral': 'red',
        'lightgray': 'gray',
        '#FFAEFF': 'purple',
        '#f7f7f7': '#d0d0d0',
        '#ffcc80': '#ff8c00',
        '#FDFD98': 'yellow',
        '#FFC300': '#FFB700',
        '#00CED1': '#008B8B',
        '#FFD700': '#DAA520',
        'lightgray': 'gray'
    };
    return colors[color] || '#000000'; 
};

async function loadArquivos(clienteId) {
    console.log('loadArquivos chamado para CLIENTE_ID:', clienteId);
    
    const fileList = document.querySelector('.file-card-list'); 
    fileList.innerHTML = ''; 
    
    try {
        const response = await window.electron.invoke('get-arquivos-por-empresa', clienteId);
        console.log('Arquivos recebidos:', response);
        
        const arquivos = response.arquivos;
        
        if (!arquivos || arquivos.length === 0) {
            console.warn('Nenhum arquivo encontrado para esta empresa.');
            const noFilesMessage = document.createElement('p');
            noFilesMessage.textContent = 'Nenhum arquivo encontrado para esta empresa.';
            noFilesMessage.classList.add('no-files-message');
            fileList.appendChild(noFilesMessage);
            return;
        }

        const getFileIcon = (extensao) => {
            const backgroundColor = getBackgroundColor(extensao);
            const iconColor = darkenColor(backgroundColor);

            switch (extensao.toLowerCase()) {
                case 'csv':
                case 'xlsx':
                case 'xls':
                case 'xlsm':
                case 'xlsb':
                    return `<i class="fas fa-file-excel file-icon" style="color: ${iconColor};"></i>`;
                case 'doc':
                case 'docx':
                    return `<i class="fas fa-file-word file-icon" style="color: ${iconColor};"></i>`;
                case 'txt':
                    return `<i class="fas fa-file-lines file-icon" style="color: ${iconColor};"></i>`;
                case 'pdf':
                    return `<i class="fas fa-file-pdf file-icon" style="color: ${iconColor};"></i>`;
                case 'png':
                case 'jpg':
                case 'jpeg':
                case 'gif':
                case 'bmp':
                case 'svg':
                    return `<i class="fas fa-file-image file-icon" style="color: ${iconColor};"></i>`;
                case 'html':
                case 'css':
                case 'js':
                case 'xml':
                    return `<i class="fas fa-file-code file-icon" style="color: ${iconColor};"></i>`;
                case 'pfx':
                case 'zip':
                case 'rar':
                case '7z':
                    return `<i class="fas fa-file-zipper file-icon" style="color: ${iconColor};"></i>`;
                case 'mp3':
                case 'wav':
                case 'flac':
                case 'ogg':
                    return `<i class="fas fa-file-audio file-icon" style="color: ${iconColor};"></i>`;
                case 'mp4':
                case 'avi':
                case 'mov':
                case 'mkv':
                    return `<i class="fas fa-file-video file-icon" style="color: ${iconColor};"></i>`;
                case 'psd':
                case 'ai':
                case 'xd':
                case 'fig':
                    return `<i class="fas fa-file-image file-icon" style="color: ${iconColor};"></i>`;
                default:
                    return `<i class="fas fa-file file-icon" style="color: ${iconColor};"></i>`;
            }
        };

        arquivos.forEach(arquivo => {
            const nomeArquivo = arquivo.ARQUIVO.split('\\').pop(); 
            const extensaoArquivo = nomeArquivo.split('.').pop(); 

            const fileCard = document.createElement('div');
            fileCard.classList.add('file-card');
            fileCard.style.backgroundColor = getBackgroundColor(extensaoArquivo); 
            
            fileCard.innerHTML = `
                ${getFileIcon(extensaoArquivo)}
                <p class="file-name">${nomeArquivo || 'Arquivo não disponível'}</p>
                <div class="file-download">
                    <i class="fas fa-download file-download-icon" title="Baixar" style="cursor: pointer;"></i>
                    <i class="fas fa-trash file-delete-icon" title="Excluir" style="cursor: pointer; margin-left: 10px;"></i>
                </div>
            `;

            // Evento para abrir o arquivo
            fileCard.addEventListener('click', () => openFile(arquivo.ARQUIVO)); 
            
            const downloadIcon = fileCard.querySelector('.file-download-icon');
            downloadIcon.addEventListener('click', async (event) => {
                event.stopPropagation();
                
                // Abre o diálogo de salvamento para escolher o caminho
                const caminhoDestino = await window.electron.invoke('escolher-caminho-salvar', nomeArquivo); 
                
                if (caminhoDestino) {
                    try {
                        const resultado = await window.electron.invoke('copy-file', arquivo.ID, caminhoDestino);
                        
                        if (resultado.success) {
                            console.log(resultado.message);
                            createNotification("Arquivo salvo com sucesso!", 'lightgreen', 'green'); // Notificação de sucesso
                        } else {
                            console.error('Erro:', resultado.message);
                        }
                    } catch (downloadError) {
                        console.error('Erro ao baixar o arquivo:', downloadError);
                    }
                } else {
                    console.warn('Operação de salvar arquivo cancelada.');
                }
            });

            // Evento para excluir o arquivo
            const deleteIcon = fileCard.querySelector('.file-delete-icon');
            deleteIcon.addEventListener('click', async (event) => {
                event.stopPropagation();

                // Verifica se o userId está no sessionStorage
                const userId = sessionStorage.getItem('userId');

                if (!userId) {
                    createNotification("É necessário autenticar para excluir um arquivo.", 'salmon', 'red');
                    return; // Sai da função se o usuário não estiver autenticado
                }

                // Atualiza a mensagem do modal
                const modalMessage = document.getElementById('modalMessage');
                modalMessage.textContent = `Você tem certeza que deseja excluir o arquivo "${nomeArquivo}"?`;

                // Mostra o modal
                const modal = document.getElementById('deleteModal');
                modal.style.display = "block";

                // Evento para confirmar a exclusão
                const confirmButton = document.getElementById('confirmDelete');
                confirmButton.onclick = async () => {
                    const resultado = await window.electron.invoke('delete-file', arquivo.ID);

                    if (resultado.success) {
                        console.log(resultado.message);
                        // Atualize a lista de arquivos
                        loadArquivos(clienteId); // Recarregue os arquivos
                    } else {
                        console.error('Erro ao excluir arquivo:', resultado.message);
                    }

                    // Fecha o modal
                    modal.style.display = "none";
                };

                // Evento para cancelar a exclusão
                const cancelButton = document.getElementById('cancelDelete');
                cancelButton.onclick = () => {
                    modal.style.display = "none"; // Fecha o modal
                };

                // Evento para fechar o modal ao clicar no "x"
                const closeModal = document.getElementById('closeModal');
                closeModal.onclick = () => {
                    modal.style.display = "none"; // Fecha o modal
                };
            });

            // Fecha o modal ao clicar fora dele
            window.onclick = (event) => {
                const modal = document.getElementById('deleteModal');
                if (event.target === modal) {
                    modal.style.display = "none"; // Fecha o modal
                }
            };
            
            fileList.appendChild(fileCard);
        });
    } catch (error) {
        console.error('Erro ao carregar arquivos do cliente:', error);
    }
}

// Função para abrir o arquivo quando o usuário clica nele
async function openFile(fileName) {
    try {
        const response = await window.electron.invoke('abrir-arquivo', fileName); 
        if (response.success) {
            console.log(`Arquivo ${fileName} executado com sucesso!`);
        } else {
            alert(response.message || 'Erro ao abrir o arquivo.');
        }
    } catch (error) {
        console.error('Erro ao abrir o arquivo:', error);
        alert('Erro ao abrir o arquivo.');
    }
}

// Função para fazer upload de um arquivo
async function uploadFile() {
    const filePaths = await window.electron.invoke('open-file-dialog');

    console.log('Caminhos recebidos do diálogo:', filePaths);

    if (filePaths && filePaths.length > 0) {
        const caminhoArquivoOrigem = filePaths[0]; 
        const dataUpload = new Date(); 
        const clienteId = currentEmpresaId; 

        try {
            const response = await window.electron.invoke('add-file', caminhoArquivoOrigem, dataUpload, clienteId);
            
            // Verifique se a resposta é válida
            if (response && typeof response === 'object') {
                let notificationMessage = '';
                let notificationColor = '';
                let borderColor = '';

                if (response.success) {
                    console.log('Arquivo adicionado com sucesso:', response.message);

                    if (response.message.includes("já existe no banco")) {
                        notificationMessage = "Este arquivo já foi adicionado para esta empresa.";
                        notificationColor = 'lightyellow';
                        borderColor = 'yellow';
                    } else {
                        notificationMessage = "Arquivo adicionado com sucesso!";
                        notificationColor = 'lightgreen';
                        borderColor = 'green';

                        // Recarrega a lista de arquivos
                        await loadArquivos(clienteId);
                    }

                    createNotification(notificationMessage, notificationColor, borderColor);
                } else {
                    console.error('Erro ao adicionar arquivo:', response.message);
                }
            } else {
                console.error('Resposta inválida recebida da chamada IPC:', response);
            }
        } catch (error) {
            console.error('Erro ao fazer o upload:', error);
        }
    } else {
        console.error('Nenhum arquivo foi selecionado.');
    }
}

// Função para criar notificações empilháveis
function createNotification(message, backgroundColor, borderColor) {
    // Cria um novo elemento de notificação
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;
    notification.style.backgroundColor = backgroundColor;
    notification.style.border = `2px solid ${borderColor}`;
    notification.style.position = 'fixed';
    notification.style.right = '10px';
    notification.style.padding = '10px';
    notification.style.zIndex = 1000;

    // Define a posição 'top' com base nas notificações existentes
    const topOffset = calculateNotificationOffset();
    notification.style.top = `${topOffset}px`;

    // Adiciona a notificação ao body
    document.body.appendChild(notification);

    // Remove a notificação após 5 segundos e atualiza as posições
    setTimeout(() => {
        notification.remove();
        updateNotificationPositions(); 
    }, 5000);
}

// Função para calcular a posição 'top' da nova notificação
function calculateNotificationOffset() {
    const notifications = document.querySelectorAll('.notification');
    let topOffset = 80; 

    notifications.forEach(notification => {
        topOffset += notification.offsetHeight + 10; 
    });

    return topOffset; 
}

// Função para atualizar as posições de todas as notificações visíveis
function updateNotificationPositions() {
    const notifications = document.querySelectorAll('.notification');
    let topOffset = 80; 

    notifications.forEach(notification => {
        notification.style.top = `${topOffset}px`; 
        topOffset += notification.offsetHeight + 10; 
    });
}

// Função para gerar o HTML do formulário
function getFormHTMLEdit() {
    return `
        <h2 class="empresa-title">Editar Empresa</h2> 
        <form id="form-detalhes" class="formulario-detalhes">
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheNumeroEmpresa" class="input-label">Número da Empresa</label>
                    <input type="number" id="detalheNumeroEmpresa">
                </div>
                <div class="form-column">
                    <label for="detalheCNPJ" class="input-label">CNPJ</label>
                    <input type="text" id="detalheCNPJ">
                </div>
                <div class="form-column">
                    <label for="detalhePerfil" class="input-label">Perfil</label>
                    <select id="detalhePerfil">
                        <option value="Bronze">Bronze</option>
                        <option value="Prata">Prata</option>
                        <option value="Ouro">Ouro</option>
                        <option value="Diamante">Diamante</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-column large">
                    <label for="detalheNomeEmpresa" class="input-label">Razão Social</label>
                    <input type="text" id="detalheNomeEmpresa">
                </div>
                <div class="form-column small">
                    <label for="detalheGrupo" class="input-label">Grupo</label>
                    <input type="text" id="detalheGrupo">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheRegimeTributario" class="input-label">Regime Tributário</label>
                    <select id="detalheRegimeTributario">
                        <option value="MEI">MEI</option>
                        <option value="Simples Nacional">Simples Nacional</option>
                        <option value="Lucro Presumido">Lucro Presumido</option>
                        <option value="Lucro Real">Lucro Real</option>
                    </select>
                </div>
                <div class="form-column">
                    <label for="detalheInicioResponsabilidade" class="input-label">Início</label>
                    <input type="date" id="detalheInicioResponsabilidade">
                </div>
                <div class="form-column">
                    <label for="detalheHonorarios" class="input-label">Valor dos Honorários</label>
                    <input type="number" id="detalheHonorarios">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column large">
                    <label for="detalheIndicacao" class="input-label">Indicação</label>
                    <input type="text" id="detalheIndicacao">
                </div>
                <div class="form-column small">
                    <label for="detalheVinculos" class="input-label">Número de Vínculos Ativos</label>
                    <input type="number" id="detalheVinculos">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheContato" class="input-label">Contato</label>
                    <input type="text" id="detalheContato">
                </div>
                <div class="form-column">
                    <label for="detalheEmail" class="input-label">Email</label>
                    <input type="text" id="detalheEmail">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheContadorAnterior" class="input-label">Contador Anterior</label>
                    <input type="text" id="detalheContadorAnterior">
                </div>
                <div class="form-column">
                    <label for="detalheContatoContadorAnterior" class="input-label">Contato Contador Anterior</label>
                    <input type="text" id="detalheContatoContadorAnterior">
                </div>
            </div>
            <div class="lista-button">
                <button type="button" class="add-empresa" id="botaoAdicionar">Adicionar</button> 
            </div>
        </form>
    `;
}

function setEventListeners() {
    document.getElementById('botaoAdicionar').addEventListener('click', adicionarCliente);
}

// Adiciona o evento de clique ao botão "Adicionar Empresa"
document.getElementById('add-empresa').addEventListener('click', () => {
    const userId = sessionStorage.getItem('userId'); // Pega o userId do sessionStorage

    // Se userId existir, continue e exiba o formulário
    if (userId) {
        document.getElementById('detalhes-cliente').innerHTML = getFormHTML();
        setEventListeners(); // Define os eventos após criar o formulário
    } else {
        createNotification("É necessário autenticar para adicionar empresas.", 'salmon', 'red');
        // Aqui você pode esconder o formulário caso ele esteja visível.
        document.getElementById('detalhes-cliente').innerHTML = ''; // Esvazia o conteúdo
    }
});

// Função para gerar o HTML do formulário
function getFormHTML() {
    return `
        <h2 class="empresa-title">Adicionar Empresa</h2> 
        <form id="form-detalhes" class="formulario-detalhes">
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheNumeroEmpresa" class="input-label">Número da Empresa</label>
                    <input type="number" id="detalheNumeroEmpresa">
                </div>
                <div class="form-column">
                    <label for="detalheCNPJ" class="input-label">CNPJ</label>
                    <input type="text" id="detalheCNPJ">
                </div>
                <div class="form-column">
                    <label for="detalhePerfil" class="input-label">Perfil</label>
                    <select id="detalhePerfil">
                        <option value="Bronze">Bronze</option>
                        <option value="Prata">Prata</option>
                        <option value="Ouro">Ouro</option>
                        <option value="Diamante">Diamante</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-column large">
                    <label for="detalheNomeEmpresa" class="input-label">Razão Social</label>
                    <input type="text" id="detalheNomeEmpresa">
                </div>
                <div class="form-column small">
                    <label for="detalheGrupo" class="input-label">Grupo</label>
                    <input type="text" id="detalheGrupo">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheRegimeTributario" class="input-label">Regime Tributário</label>
                    <select id="detalheRegimeTributario">
                        <option value="MEI">MEI</option>
                        <option value="Simples Nacional">Simples Nacional</option>
                        <option value="Lucro Presumido">Lucro Presumido</option>
                        <option value="Lucro Real">Lucro Real</option>
                    </select>
                </div>
                <div class="form-column">
                    <label for="detalheInicioResponsabilidade" class="input-label">Início</label>
                    <input type="date" id="detalheInicioResponsabilidade">
                </div>
                <div class="form-column">
                    <label for="detalheHonorarios" class="input-label">Valor dos Honorários</label>
                    <input type="number" id="detalheHonorarios">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column large">
                    <label for="detalheIndicacao" class="input-label">Indicação</label>
                    <input type="text" id="detalheIndicacao">
                </div>
                <div class="form-column small">
                    <label for="detalheVinculos" class="input-label">Número de Vínculos Ativos</label>
                    <input type="number" id="detalheVinculos">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheContato" class="input-label">Contato</label>
                    <input type="text" id="detalheContato">
                </div>
                <div class="form-column">
                    <label for="detalheEmail" class="input-label">Email</label>
                    <input type="email" id="detalheEmail">
                </div>
            </div>
            <div class="form-row">
                <div class="form-column">
                    <label for="detalheContadorAnterior" class="input-label">Contador Anterior</label>
                    <input type="text" id="detalheContadorAnterior">
                </div>
                <div class="form-column">
                    <label for="detalheContatoContadorAnterior" class="input-label">Contato Contador Anterior</label>
                    <input type="text" id="detalheContatoContadorAnterior">
                </div>
            </div>
            <div class="lista-button">
                <button type="button" class="add-empresa" id="botaoAdicionar">Adicionar</button> 
            </div>
        </form>
    `;
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
        return { success: true };
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        return { success: false };
    }
}

// Função adicionada fora de qualquer escopo de evento
async function adicionarCliente() {
    const clienteData = {
        numero_empresa: document.getElementById('detalheNumeroEmpresa').value,
        cnpj: document.getElementById('detalheCNPJ').value,
        perfil: document.getElementById('detalhePerfil').value,
        nome_empresa: document.getElementById('detalheNomeEmpresa').value,
        grupo: document.getElementById('detalheGrupo').value,
        regime_tributario: document.getElementById('detalheRegimeTributario').value,
        inicio_responsabilidade: document.getElementById('detalheInicioResponsabilidade').value,
        vl_honorarios: document.getElementById('detalheHonorarios').value,
        indicacao: document.getElementById('detalheIndicacao').value,
        vinculos: document.getElementById('detalheVinculos').value,
        contato: document.getElementById('detalheContato').value,
        email: document.getElementById('detalheEmail').value,
        contador_anterior: document.getElementById('detalheContadorAnterior').value,
        contato_contador_anterior: document.getElementById('detalheContatoContadorAnterior').value,
    };

    try {
        const result = await window.electron.invoke('add-cliente', clienteData);
        // Remover o alert para não mostrar a mensagem
        // alert(result.message);

        await loadClientes(); 
        createNotification("Cliente adicionado com sucesso!", 'lightgreen', 'green'); 

        // Limpa os campos do formulário
        document.querySelectorAll('.formulario-detalhes input, .formulario-detalhes select').forEach(input => {
            input.value = ''; // Limpa o valor dos campos
        });
    } catch (error) {
        console.error('Erro ao adicionar cliente:', error);
        createNotification("Erro ao adicionar cliente!", 'salmon', 'red'); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Seu código de inicialização aqui
    loadClientes(); 
    setEventListeners();
});

