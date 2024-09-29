async function handleLogin(event) {
    event.preventDefault(); 

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await window.electron.invoke('fazer-login', { username, password });
        console.log('Resposta do IPC:', response);
        if (response.success) {
            sessionStorage.setItem('userId', response.user.id);
            createNotification("Autenticado com sucesso!", 'lightgreen', 'green');
        
            // Limpa os campos do formulário após login bem-sucedido
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
        } else {
            // Substitui o alerta pela notificação personalizada
            createNotification(response.message, 'salmon', 'red');
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        // Substitui o alerta pela notificação personalizada
        createNotification('Erro ao fazer login. Tente novamente.', 'salmon', 'red');
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

// Adiciona um listener ao formulário de login
document.querySelector('form').addEventListener('submit', handleLogin);
