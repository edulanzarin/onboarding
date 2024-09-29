/**
 * Função para carregar o conteúdo de um arquivo HTML e exibí-lo em um elemento da página.
 *
 * Esta função realiza uma requisição para obter o conteúdo HTML de uma URL especificada
 * e, em seguida, insere esse conteúdo dentro de um elemento com o ID 'content'.
 *
 * @async
 * @function loadPage
 * @param {string} url - A URL do arquivo HTML a ser carregado.
 * @throws {Error} Lança um erro se a requisição falhar ou se o conteúdo não puder ser carregado.
 * 
 * @example
 * // Carregar conteúdo de uma página HTML e exibir no elemento com ID 'content'
 * loadPage('pagina.html')
 *   .then(() => console.log('Conteúdo carregado com sucesso!'))
 *   .catch(error => console.error('Erro ao carregar conteúdo:', error));
 */
async function loadPage(url) {
    const response = await fetch(url);
    const content = await response.text();
    document.getElementById('content').innerHTML = content;
}
