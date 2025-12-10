// ============================================
// DADOS E ESTADO GLOBAL
// ============================================
let data = {};
let flatData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 20;
let sortColumn = null;
let sortDirection = 'asc';
let chartClasse = null;
let chartUnidade = null;

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success', title = '') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const titles = {
        success: title || 'Sucesso!',
        error: title || 'Erro!',
        warning: title || 'Atenção!',
        info: title || 'Informação'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remover após 4 segundos
    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar dados
    await loadData();
    
    // Inicializar data
    updateDate();
    
    // Inicializar tabs
    initTabs();
    
    // Inicializar dashboard
    initDashboard();
    
    // Inicializar tabela
    initTable();
    
    // Inicializar organograma
    initOrganograma();
    
    // Inicializar botões de gerenciamento de dados
    setupDataButtons();
});

// ============================================
// CARREGAMENTO DE DADOS
// ============================================
async function loadData() {
    try {
        // Tentar carregar do localStorage primeiro
        const savedData = localStorage.getItem('efetivo_data');
        
        if (savedData) {
            data = JSON.parse(savedData);
            console.log('Dados carregados do localStorage');
        } else {
            // Se não existe no localStorage, carregar do JSON
            const response = await fetch('base_organizacao.json');
            data = await response.json();
            // Salvar no localStorage para próximas vezes
            localStorage.setItem('efetivo_data', JSON.stringify(data));
            console.log('Dados carregados do arquivo JSON e salvos no localStorage');
        }
        
        // Criar array flat para facilitar manipulação
        flatData = [];
        Object.keys(data).forEach(local => {
            Object.keys(data[local]).forEach(classe => {
                data[local][classe].forEach(pessoa => {
                    flatData.push(pessoa);
                });
            });
        });
        
        filteredData = [...flatData];
        showToast(`${flatData.length} registros carregados (${getUniqueCount(flatData)} militares únicos)`, 'info', 'Dados Carregados');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showToast('Não foi possível carregar os dados do arquivo JSON', 'error', 'Erro ao Carregar');
    }
}

// Função para salvar dados no localStorage
function saveDataToLocalStorage() {
    try {
        localStorage.setItem('efetivo_data', JSON.stringify(data));
        console.log('Dados salvos no localStorage');
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        showToast('Erro ao salvar dados localmente', 'error');
        return false;
    }
}

// Função para contar militares únicos (não conta duplicados, exceto xxx.xxx-x)
function getUniqueCount(pessoas) {
    const numeros = new Set();
    let count = 0;
    
    pessoas.forEach(p => {
        if (p.NUMERO === 'xxx.xxx-x') {
            // Sempre conta inexistentes
            count++;
        } else if (!numeros.has(p.NUMERO)) {
            // Conta apenas a primeira ocorrência do número
            numeros.add(p.NUMERO);
            count++;
        }
    });
    
    return count;
}

// Função para obter pessoas únicas (mantém primeira ocorrência de cada número)
function getUniquePessoas(pessoas) {
    const numeros = new Set();
    const unique = [];
    
    pessoas.forEach(p => {
        if (p.NUMERO === 'xxx.xxx-x') {
            // Sempre inclui inexistentes
            unique.push(p);
        } else if (!numeros.has(p.NUMERO)) {
            // Inclui apenas a primeira ocorrência
            numeros.add(p.NUMERO);
            unique.push(p);
        }
    });
    
    return unique;
}

// ============================================
// ATUALIZAÇÃO DE DATA
// ============================================
function updateDate() {
    const dateDisplay = document.querySelector('.date-display');
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateStr = new Date().toLocaleDateString('pt-BR', options);
    dateDisplay.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}

// ============================================
// GERENCIAMENTO DE TABS
// ============================================
function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Remover active de todas as tabs
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Adicionar active na tab clicada
            tab.classList.add('active');
            document.getElementById(tabName).classList.add('active');
            
            // Renderizar análise se for a aba de análise
            if (tabName === 'analise') {
                renderAnalise();
            }
        });
    });
}

// ============================================
// DASHBOARD
// ============================================
function initDashboard() {
    updateKPIs();
    renderCharts();
    renderStats();
    renderUnitCards();
}

function updateKPIs() {
    const totalEfetivo = getUniqueCount(flatData);
    const uniquePessoas = getUniquePessoas(flatData);
    const oficiais = uniquePessoas.filter(p => p.CLASSE === 'OF' || p.CLASSE === 'QOE').length;
    const pracas = uniquePessoas.filter(p => p.CLASSE === 'CB/SD' || p.CLASSE === 'SGT' || p.CLASSE === 'QPE').length;
    const unidades = Object.keys(data).length;
    
    document.getElementById('totalEfetivo').textContent = totalEfetivo;
    document.getElementById('totalOficiais').textContent = oficiais;
    document.getElementById('totalPracas').textContent = pracas;
    document.getElementById('totalUnidades').textContent = unidades;
}

function renderCharts() {
    renderClassChart();
    renderUnidadeChart();
}

function renderClassChart() {
    const ctx = document.getElementById('chartClasse');
    
    // Destruir gráfico existente
    if (chartClasse) {
        chartClasse.destroy();
    }
    
    // Contar por classe (apenas pessoas únicas)
    const uniquePessoas = getUniquePessoas(flatData);
    const classeCount = {};
    uniquePessoas.forEach(p => {
        classeCount[p.CLASSE] = (classeCount[p.CLASSE] || 0) + 1;
    });
    
    const colors = {
        'OF': '#ed8936',
        'SGT': '#1a365d',
        'QPE': '#805ad5',
        'QOE': '#d53f8c',
        'CB/SD': '#38a169'
    };
    
    chartClasse = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(classeCount),
            datasets: [{
                data: Object.values(classeCount),
                backgroundColor: Object.keys(classeCount).map(c => colors[c] || '#718096'),
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderUnidadeChart() {
    const ctx = document.getElementById('chartUnidade');
    
    // Destruir gráfico existente
    if (chartUnidade) {
        chartUnidade.destroy();
    }
    
    // Contar por unidade (precisa contar com duplicatas para mostrar alocações)
    const unidadeCount = {};
    flatData.forEach(p => {
        unidadeCount[p.LOCAL] = (unidadeCount[p.LOCAL] || 0) + 1;
    });
    
    // Ordenar por quantidade
    const sorted = Object.entries(unidadeCount).sort((a, b) => b[1] - a[1]);
    
    chartUnidade = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                label: 'Alocações',
                data: sorted.map(s => s[1]),
                backgroundColor: '#3182ce',
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `Alocações: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function renderStats() {
    renderFuncaoStats();
    renderPostoStats();
}

function renderFuncaoStats() {
    // Usar pessoas únicas
    const uniquePessoas = getUniquePessoas(flatData);
    
    const funcaoCount = {};
    uniquePessoas.forEach(p => {
        funcaoCount[p.FUNÇÃO] = (funcaoCount[p.FUNÇÃO] || 0) + 1;
    });
    
    const total = uniquePessoas.length;
    const container = document.getElementById('funcaoStats');
    
    const sorted = Object.entries(funcaoCount).sort((a, b) => b[1] - a[1]);
    
    container.innerHTML = sorted.map(([funcao, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return `
            <div class="stat-item">
                <div class="stat-info">
                    <div class="stat-icon">
                        <i class="fas fa-briefcase"></i>
                    </div>
                    <span class="stat-label">${funcao}</span>
                </div>
                <div class="stat-value">
                    <span class="stat-count">${count}</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPostoStats() {
    // Usar pessoas únicas
    const uniquePessoas = getUniquePessoas(flatData);
    
    const postoCount = {};
    uniquePessoas.forEach(p => {
        postoCount[p['POST/GRAD']] = (postoCount[p['POST/GRAD']] || 0) + 1;
    });
    
    const total = uniquePessoas.length;
    const container = document.getElementById('postoStats');
    
    // Ordem hierárquica
    const ordem = ['Maj', 'Cap', '1º Ten', '2º Ten', '1º Sgt', '2º Sgt', '3º Sgt', 'Cb', 'Sd'];
    const sorted = ordem
        .filter(posto => postoCount[posto])
        .map(posto => [posto, postoCount[posto]]);
    
    container.innerHTML = sorted.map(([posto, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return `
            <div class="stat-item">
                <div class="stat-info">
                    <div class="stat-icon">
                        <i class="fas fa-medal"></i>
                    </div>
                    <span class="stat-label">${posto}</span>
                </div>
                <div class="stat-value">
                    <span class="stat-count">${count}</span>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderUnitCards() {
    const container = document.getElementById('unitCards');
    
    container.innerHTML = Object.keys(data).map(local => {
        const unidadeData = data[local];
        
        // Coletar todas as pessoas desta unidade
        const allPessoasUnidade = [];
        Object.values(unidadeData).forEach(pessoas => {
            allPessoasUnidade.push(...pessoas);
        });
        
        // Contar únicos nesta unidade
        const total = getUniqueCount(allPessoasUnidade);
        
        // Contar por classe (usando pessoas únicas)
        const uniquePessoasUnidade = getUniquePessoas(allPessoasUnidade);
        const classeStats = Object.keys(unidadeData).map(classe => {
            const count = uniquePessoasUnidade.filter(p => p.CLASSE === classe).length;
            return `
                <div class="unit-stat">
                    <span class="unit-stat-label">${classe}</span>
                    <span class="unit-stat-value">${count}</span>
                </div>
            `;
        }).join('');
        
        return `
            <div class="unit-card">
                <div class="unit-card-header">
                    <h4>${local}</h4>
                    <span class="unit-count">${total}</span>
                </div>
                <div class="unit-card-body">
                    ${classeStats}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// TABELA
// ============================================
function initTable() {
    populateFilters();
    setupFilterListeners();
    setupSortListeners();
    renderTable();
    setupExport();
    setupModalEvents();
}

function populateFilters() {
    // Popular filtro de Local
    const locais = [...new Set(flatData.map(p => p.LOCAL))].sort();
    const localFilter = document.getElementById('filterLocal');
    locais.forEach(local => {
        const option = document.createElement('option');
        option.value = local;
        option.textContent = local;
        localFilter.appendChild(option);
    });
    
    // Popular filtro de Classe
    const classes = [...new Set(flatData.map(p => p.CLASSE))].sort();
    const classeFilter = document.getElementById('filterClasse');
    classes.forEach(classe => {
        const option = document.createElement('option');
        option.value = classe;
        option.textContent = classe;
        classeFilter.appendChild(option);
    });
    
    // Popular filtro de Função
    const funcoes = [...new Set(flatData.map(p => p.FUNÇÃO))].sort();
    const funcaoFilter = document.getElementById('filterFuncao');
    funcoes.forEach(funcao => {
        const option = document.createElement('option');
        option.value = funcao;
        option.textContent = funcao;
        funcaoFilter.appendChild(option);
    });
}

function setupFilterListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterLocal = document.getElementById('filterLocal');
    const filterClasse = document.getElementById('filterClasse');
    const filterFuncao = document.getElementById('filterFuncao');
    const clearBtn = document.getElementById('clearFilters');
    
    searchInput.addEventListener('input', applyFilters);
    filterLocal.addEventListener('change', applyFilters);
    filterClasse.addEventListener('change', applyFilters);
    filterFuncao.addEventListener('change', applyFilters);
    
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterLocal.value = '';
        filterClasse.value = '';
        filterFuncao.value = '';
        applyFilters();
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const localFilter = document.getElementById('filterLocal').value;
    const classeFilter = document.getElementById('filterClasse').value;
    const funcaoFilter = document.getElementById('filterFuncao').value;
    
    filteredData = flatData.filter(pessoa => {
        const matchSearch = !searchTerm || 
            pessoa.NOME.toLowerCase().includes(searchTerm) ||
            pessoa.NUMERO.toLowerCase().includes(searchTerm) ||
            pessoa['POST/GRAD'].toLowerCase().includes(searchTerm);
        
        const matchLocal = !localFilter || pessoa.LOCAL === localFilter;
        const matchClasse = !classeFilter || pessoa.CLASSE === classeFilter;
        const matchFuncao = !funcaoFilter || pessoa.FUNÇÃO === funcaoFilter;
        
        return matchSearch && matchLocal && matchClasse && matchFuncao;
    });
    
    currentPage = 1;
    renderTable();
}

function setupSortListeners() {
    const headers = document.querySelectorAll('.data-table th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            
            sortData();
            updateSortIcons();
            renderTable();
        });
    });
}

function sortData() {
    filteredData.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}

function updateSortIcons() {
    const headers = document.querySelectorAll('.data-table th[data-sort]');
    headers.forEach(header => {
        const icon = header.querySelector('i');
        if (header.dataset.sort === sortColumn) {
            icon.className = sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        } else {
            icon.className = 'fas fa-sort';
        }
    });
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredData.slice(start, end);
    
    tbody.innerHTML = pageData.map((pessoa, index) => {
        const globalIndex = flatData.findIndex(p => 
            p.NUMERO === pessoa.NUMERO && 
            p.NOME === pessoa.NOME && 
            p.LOCAL === pessoa.LOCAL
        );
        
        return `
        <tr>
            <td>${pessoa.NUMERO}</td>
            <td><strong>${pessoa['POST/GRAD']}</strong></td>
            <td>${pessoa.NOME}</td>
            <td>${pessoa.LOCAL}</td>
            <td><span class="badge badge-${pessoa.FUNÇÃO.toLowerCase()}">${pessoa.FUNÇÃO}</span></td>
            <td><span class="badge badge-${pessoa.CLASSE.toLowerCase().replace('/', '')}">${pessoa.CLASSE}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editMilitar(${globalIndex})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-delete" onclick="deleteMilitar(${globalIndex})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
    
    updateResultsInfo();
    renderPagination();
}

function updateResultsInfo() {
    const resultsCount = document.getElementById('resultsCount');
    resultsCount.textContent = `${filteredData.length} registro${filteredData.length !== 1 ? 's' : ''} encontrado${filteredData.length !== 1 ? 's' : ''}`;
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Mostrar páginas
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += `<span>...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span>...</span>`;
        html += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderTable();
    document.getElementById('tabela').scrollIntoView({ behavior: 'smooth' });
}

function setupExport() {
    document.getElementById('exportBtn').addEventListener('click', () => {
        exportToCSV();
    });
}

function exportToCSV() {
    const headers = ['NUMERO', 'POST/GRAD', 'NOME', 'LOCAL', 'FUNÇÃO', 'CLASSE'];
    const csv = [
        headers.join(','),
        ...filteredData.map(p => headers.map(h => `"${p[h]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `efetivo_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ============================================
// MODAL E CRUD
// ============================================
function setupModalEvents() {
    const modal = document.getElementById('militarModal');
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('btnCancel');
    const addBtn = document.getElementById('addMilitarBtn');
    const form = document.getElementById('militarForm');
    
    // Abrir modal para adicionar
    addBtn.addEventListener('click', () => {
        openModal();
    });
    
    // Fechar modal
    const closeModal = () => {
        modal.classList.remove('active');
        form.reset();
        document.getElementById('editIndex').value = '';
    };
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // Submeter formulário
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveMilitar();
    });
}

function openModal(index = null) {
    const modal = document.getElementById('militarModal');
    const form = document.getElementById('militarForm');
    const title = document.getElementById('modalTitle');
    
    if (index !== null) {
        // Editar
        title.innerHTML = '<i class="fas fa-user-edit"></i> Editar Militar';
        const pessoa = flatData[index];
        
        document.getElementById('editIndex').value = index;
        document.getElementById('inputNumero').value = pessoa.NUMERO;
        document.getElementById('inputPostoGrad').value = pessoa['POST/GRAD'];
        document.getElementById('inputNome').value = pessoa.NOME;
        document.getElementById('inputLocal').value = pessoa.LOCAL;
        document.getElementById('inputFuncao').value = pessoa.FUNÇÃO;
        document.getElementById('inputClasse').value = pessoa.CLASSE;
    } else {
        // Adicionar
        title.innerHTML = '<i class="fas fa-user-plus"></i> Adicionar Militar';
        form.reset();
        document.getElementById('editIndex').value = '';
    }
    
    modal.classList.add('active');
}

async function saveMilitar() {
    const editIndex = document.getElementById('editIndex').value;
    
    const militar = {
        NUMERO: document.getElementById('inputNumero').value,
        'POST/GRAD': document.getElementById('inputPostoGrad').value,
        NOME: document.getElementById('inputNome').value,
        LOCAL: document.getElementById('inputLocal').value,
        FUNÇÃO: document.getElementById('inputFuncao').value,
        CLASSE: document.getElementById('inputClasse').value
    };
    
    if (editIndex !== '') {
        // Editar existente
        const index = parseInt(editIndex);
        const oldMilitar = flatData[index];
        
        // Remover do objeto data
        const localData = data[oldMilitar.LOCAL];
        if (localData && localData[oldMilitar.CLASSE]) {
            const arr = localData[oldMilitar.CLASSE];
            const idx = arr.findIndex(p => 
                p.NUMERO === oldMilitar.NUMERO && 
                p.NOME === oldMilitar.NOME
            );
            if (idx !== -1) {
                arr.splice(idx, 1);
                if (arr.length === 0) {
                    delete localData[oldMilitar.CLASSE];
                }
            }
        }
        
        // Atualizar flatData
        flatData[index] = militar;
    } else {
        // Adicionar novo
        flatData.push(militar);
    }
    
    // Adicionar ao objeto data
    if (!data[militar.LOCAL]) {
        data[militar.LOCAL] = {};
    }
    if (!data[militar.LOCAL][militar.CLASSE]) {
        data[militar.LOCAL][militar.CLASSE] = [];
    }
    data[militar.LOCAL][militar.CLASSE].push(militar);
    
    // Fechar modal
    document.getElementById('militarModal').classList.remove('active');
    document.getElementById('militarForm').reset();
    
    // Salvar no localStorage
    const saved = saveDataToLocalStorage();
    
    if (saved) {
        // Atualizar interface
        filteredData = [...flatData];
        initDashboard();
        // Re-renderizar organograma para refletir alterações
        initOrganograma();
        applyFilters();
        
        // Mensagem de sucesso
        if (editIndex !== '') {
            showToast(`Militar ${militar['POST/GRAD']} ${militar.NOME} atualizado com sucesso!`, 'success');
        } else {
            showToast(`Militar ${militar['POST/GRAD']} ${militar.NOME} adicionado com sucesso!`, 'success');
        }
    }
}

function editMilitar(index) {
    openModal(index);
}

async function deleteMilitar(index) {
    const pessoa = flatData[index];
    const nome = `${pessoa['POST/GRAD']} ${pessoa.NOME}`;
    
    if (!confirm(`Tem certeza que deseja excluir ${nome}?`)) {
        return;
    }
    
    // Remover do objeto data
    const localData = data[pessoa.LOCAL];
    if (localData && localData[pessoa.CLASSE]) {
        const arr = localData[pessoa.CLASSE];
        const idx = arr.findIndex(p => 
            p.NUMERO === pessoa.NUMERO && 
            p.NOME === pessoa.NOME
        );
        if (idx !== -1) {
            arr.splice(idx, 1);
            if (arr.length === 0) {
                delete localData[pessoa.CLASSE];
            }
        }
    }
    
    // Remover do flatData
    flatData.splice(index, 1);
    
    // Salvar no localStorage
    const saved = saveDataToLocalStorage();
    
    if (saved) {
        // Atualizar interface
        filteredData = [...flatData];
        initDashboard();
        // Re-renderizar organograma para refletir exclusão
        initOrganograma();
        applyFilters();
        
        showToast(`${nome} foi excluído com sucesso!`, 'success');
    }
}

// ============================================
// ORGANOGRAMA
// ============================================
function initOrganograma() {
    const wrapper = document.getElementById('orgWrapper');
    
    const hierarchy = {
        name: 'SDTS',
        children: [
            { name: 'SDTS1' },
            { name: 'SDTS2' },
            { name: 'SDTS3' },
            {
                name: 'NTS',
                children: [
                    { name: 'NST INFORMATICA' },
                    { name: 'NTS TELECOM' },
                    { name: 'NTS CONTRATOS' }
                ]
            }
        ]
    };
    
    wrapper.innerHTML = renderOrgNode(hierarchy);
    
    // Adicionar eventos de clique
    setupOrgClickEvents();
    
    // Adicionar eventos dos botões
    setupOrgButtons();
}

function renderOrgNode(node, level = 0) {
    const nodeData = data[node.name];
    const count = nodeData ? Object.values(nodeData).reduce((sum, arr) => sum + arr.length, 0) : 0;
    
    let html = '<div class="org-node">';
    html += `
        <div class="org-box" data-local="${node.name}">
            <div class="org-box-title">${node.name}</div>
            <div class="org-box-count">
                <i class="fas fa-users"></i>
                ${count} ${count === 1 ? 'pessoa' : 'pessoas'}
            </div>
        </div>
    `;
    
    // Detalhes expandíveis
    if (nodeData) {
        html += `<div class="org-details" data-details="${node.name}">`;
        html += renderOrgDetails(node.name);
        html += '</div>';
    }
    
    // Renderizar filhos
    if (node.children && node.children.length > 0) {
        const childrenClass = level === 0 ? 'org-children' : 'org-sub-children';
        html += `<div class="${childrenClass}">`;
        node.children.forEach(child => {
            html += '<div class="org-child">';
            html += renderOrgNode(child, level + 1);
            html += '</div>';
        });
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

function renderOrgDetails(local) {
    const localData = data[local];
    if (!localData) return '<div class="org-details-header">Sem dados</div>';
    
    let html = `
        <div class="org-details-header">
            <span>${local}</span>
            <i class="fas fa-times" style="cursor: pointer;" onclick="closeOrgDetails('${local}')"></i>
        </div>
        <div class="org-details-content">
    `;
    
    // Ordem: CHEFE -> ADJ -> AUX
    const ordemFuncao = ['CHEFE', 'CMTE', 'ADJ', 'AUX'];
    
    ordemFuncao.forEach(funcao => {
        // Buscar pessoas com essa função
        const pessoas = [];
        Object.keys(localData).forEach(classe => {
            localData[classe].forEach(pessoa => {
                if (pessoa.FUNÇÃO === funcao) {
                    pessoas.push(pessoa);
                }
            });
        });
        
        if (pessoas.length > 0) {
            const funcaoClass = funcao === 'CHEFE' || funcao === 'CMTE' ? 'chefe' : funcao.toLowerCase();
            html += `
                <div class="org-section">
                    <div class="org-section-header ${funcaoClass}">
                        <span>${funcao}</span>
                        <span class="org-section-count">${pessoas.length}</span>
                    </div>
            `;
            
            pessoas.forEach(pessoa => {
                html += `
                    <div class="org-person">
                        <div class="org-person-header">
                            <span class="org-person-grad">${pessoa['POST/GRAD']}</span>
                            <span class="org-person-nome">${pessoa.NOME}</span>
                        </div>
                        <div class="org-person-info">
                            <span><i class="fas fa-id-card"></i> ${pessoa.NUMERO}</span>
                            <span><i class="fas fa-tag"></i> ${pessoa.CLASSE}</span>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }
    });
    
    html += '</div>';
    return html;
}

function setupOrgClickEvents() {
    const boxes = document.querySelectorAll('.org-box');
    boxes.forEach(box => {
        box.addEventListener('click', (e) => {
            e.stopPropagation();
            const local = box.dataset.local;
            toggleOrgDetails(local, box);
        });
    });
}

function toggleOrgDetails(local, box) {
    const details = document.querySelector(`[data-details="${local}"]`);
    const isVisible = details.classList.contains('show');
    
    // Apenas alternar o estado do clicado (permite múltiplos abertos)
    if (isVisible) {
        details.classList.remove('show');
        box.classList.remove('expanded');
    } else {
        details.classList.add('show');
        box.classList.add('expanded');
        box.classList.add('highlight');
        setTimeout(() => box.classList.remove('highlight'), 500);
    }
}

function closeOrgDetails(local) {
    const details = document.querySelector(`[data-details="${local}"]`);
    const box = document.querySelector(`[data-local="${local}"]`);
    details.classList.remove('show');
    box.classList.remove('expanded');
}

function setupOrgButtons() {
    // Expandir todos
    document.getElementById('expandAllOrg').addEventListener('click', () => {
        document.querySelectorAll('.org-details').forEach(d => d.classList.add('show'));
        document.querySelectorAll('.org-box').forEach(b => b.classList.add('expanded'));
    });
    
    // Recolher todos
    document.getElementById('collapseAllOrg').addEventListener('click', () => {
        document.querySelectorAll('.org-details').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.org-box').forEach(b => b.classList.remove('expanded'));
    });
}

// ============================================
// GERENCIAMENTO DE DADOS (EXPORTAR/RESETAR)
// ============================================

function setupDataButtons() {
    // Exportar dados
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        try {
            const dataStr = JSON.stringify(data, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `base_organizacao_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);
            showToast('Dados exportados com sucesso!', 'success', 'Exportação');
        } catch (error) {
            console.error('Erro ao exportar:', error);
            showToast('Erro ao exportar dados', 'error');
        }
    });
    
    // Resetar dados
    document.getElementById('resetDataBtn').addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja resetar os dados? Todas as alterações serão perdidas e os dados originais serão restaurados.')) {
            return;
        }
        
        try {
            // Limpar localStorage
            localStorage.removeItem('efetivo_data');
            
            // Recarregar do arquivo original
            const response = await fetch('base_organizacao.json');
            data = await response.json();
            
            // Salvar no localStorage
            localStorage.setItem('efetivo_data', JSON.stringify(data));
            
            // Recarregar página para atualizar tudo
            location.reload();
            
            showToast('Dados resetados com sucesso!', 'success', 'Reset');
        } catch (error) {
            console.error('Erro ao resetar:', error);
            showToast('Erro ao resetar dados', 'error');
        }
    });
}

// ============================================
// ANÁLISE DDQOD
// ============================================

// Dados previstos no DDQOD
const ddqodPrevisto = {
    'SDTS': {
        'TCEL': 1,
        'MAJ': 3,
        'CAP': 1,
        'TEN': 1,
        'OF - QOE': 0,
        'ST/SGT': 4,
        'CB/SD': 3,
        'PR - QPE': 4
    },
    'NTS': {
        'TCEL': 0,
        'MAJ': 1,
        'CAP': 1,
        'TEN': 1,
        'OF - QOE': 1,
        'ST/SGT': 8,
        'CB/SD': 7,
        'PR - QPE': 11
    }
};

function mapPostoToCategory(posto, classe) {
    // Se tem classe QPE, conta como PR - QPE
    if (classe === 'QPE') {
        return 'PR - QPE';
    }
    
    // Se tem classe QOE, conta como OF - QOE
    if (classe === 'QOE') {
        return 'OF - QOE';
    }
    
    // Mapeamento por posto/graduação
    const mapping = {
        'Ten Cel': 'TCEL',
        'Maj': 'MAJ',
        'Cap': 'CAP',
        '1º Ten': 'TEN',
        '2º Ten': 'TEN',
        'Sub Ten': 'ST/SGT',
        '1º Sgt': 'ST/SGT',
        '2º Sgt': 'ST/SGT',
        '3º Sgt': 'ST/SGT',
        'Cb': 'CB/SD',
        'Sd': 'CB/SD'
    };
    
    return mapping[posto] || posto;
}

function calcularExistente() {
    const existente = {};
    
    // Filtrar apenas SDTS e NTS/NST (pode ter variações como SDTS1, SDTS2, NTS INFORMATICA, NST INFORMATICA, etc)
    const pessoasRelevantes = getUniquePessoas(flatData).filter(p => {
        const local = p.LOCAL.toUpperCase();
        return local === 'SDTS' || local === 'NTS' || 
               local.startsWith('SDTS') || local.startsWith('NTS') || local.startsWith('NST');
    });
    
    pessoasRelevantes.forEach(pessoa => {
        // Determinar a seção base (SDTS ou NTS)
        const localUpper = pessoa.LOCAL.toUpperCase();
        const secaoBase = (localUpper.startsWith('NTS') || localUpper.startsWith('NST')) ? 'NTS' : 'SDTS';
        
        if (!existente[secaoBase]) {
            existente[secaoBase] = {
                'TCEL': 0,
                'MAJ': 0,
                'CAP': 0,
                'TEN': 0,
                'OF - QOE': 0,
                'ST/SGT': 0,
                'CB/SD': 0,
                'PR - QPE': 0
            };
        }
        
        const categoria = mapPostoToCategory(pessoa['POST/GRAD'], pessoa.CLASSE);
        if (existente[secaoBase][categoria] !== undefined) {
            existente[secaoBase][categoria]++;
        }
    });
    
    return existente;
}

function renderAnalise() {
    const existente = calcularExistente();
    
    // Calcular totais
    let totalPrevisto = 0;
    let totalExistente = 0;
    let totalDeficit = 0;
    let totalExcedente = 0;
    
    Object.keys(ddqodPrevisto).forEach(secao => {
        Object.keys(ddqodPrevisto[secao]).forEach(cat => {
            const prev = ddqodPrevisto[secao][cat];
            const exist = (existente[secao] && existente[secao][cat]) || 0;
            
            totalPrevisto += prev;
            totalExistente += exist;
            
            const diff = exist - prev;
            if (diff < 0) {
                totalDeficit += Math.abs(diff);
            } else if (diff > 0) {
                totalExcedente += diff;
            }
        });
    });
    
    // Atualizar resumo
    document.getElementById('totalPrevisto').textContent = totalPrevisto;
    document.getElementById('totalExistente').textContent = totalExistente;
    document.getElementById('totalDeficit').textContent = totalDeficit;
    document.getElementById('totalExcedente').textContent = totalExcedente;
    
    // Renderizar análise por seção
    const container = document.getElementById('analiseSections');
    container.innerHTML = '';
    
    Object.keys(ddqodPrevisto).forEach(secao => {
        const previstoSecao = ddqodPrevisto[secao];
        const existenteSecao = existente[secao] || {};
        
        let deficitSecao = 0;
        let excedenteSecao = 0;
        
        const itemsHTML = Object.keys(previstoSecao).map(categoria => {
            const prev = previstoSecao[categoria];
            const exist = existenteSecao[categoria] || 0;
            const diff = exist - prev;
            
            if (diff < 0) deficitSecao += Math.abs(diff);
            if (diff > 0) excedenteSecao += diff;
            
            let status = 'ok';
            let statusText = 'OK';
            if (diff < 0) {
                status = 'deficit';
                statusText = `Faltam ${Math.abs(diff)}`;
            } else if (diff > 0) {
                status = 'excedente';
                statusText = `Excesso de ${diff}`;
            }
            
            const percentage = prev > 0 ? Math.min((exist / prev) * 100, 150) : (exist > 0 ? 150 : 0);
            let barClass = 'complete';
            if (exist < prev) barClass = 'under';
            else if (exist > prev) barClass = 'over';
            
            return `
                <div class="analise-item">
                    <div class="analise-item-header">
                        <div class="analise-item-title">${categoria}</div>
                        <div class="analise-item-badge ${status}">${statusText}</div>
                    </div>
                    <div class="analise-item-body">
                        <div class="analise-row">
                            <span class="analise-label"><i class="fas fa-clipboard-list"></i> Previsto</span>
                            <span class="analise-value previsto">${prev}</span>
                        </div>
                        <div class="analise-row">
                            <span class="analise-label"><i class="fas fa-user-check"></i> Existente</span>
                            <span class="analise-value existente">${exist}</span>
                        </div>
                        <div class="analise-row">
                            <span class="analise-label"><i class="fas fa-balance-scale"></i> Diferença</span>
                            <span class="analise-value ${status}">${diff > 0 ? '+' : ''}${diff}</span>
                        </div>
                        <div class="analise-bar">
                            <div class="analise-bar-fill ${barClass}" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        let secaoStatus = 'ok';
        let secaoStatusText = 'Completo';
        if (deficitSecao > 0) {
            secaoStatus = 'deficit';
            secaoStatusText = `Déficit de ${deficitSecao}`;
        } else if (excedenteSecao > 0) {
            secaoStatus = 'excedente';
            secaoStatusText = `Excedente de ${excedenteSecao}`;
        }
        
        container.innerHTML += `
            <div class="analise-section">
                <div class="analise-section-header">
                    <h2 class="analise-section-title">
                        <i class="fas fa-building"></i>
                        ${secao}
                    </h2>
                    <div class="analise-section-status">
                        <div class="status-badge ${secaoStatus}">
                            <i class="fas fa-${secaoStatus === 'ok' ? 'check-circle' : secaoStatus === 'deficit' ? 'exclamation-circle' : 'info-circle'}"></i>
                            ${secaoStatusText}
                        </div>
                    </div>
                </div>
                <div class="analise-grid">
                    ${itemsHTML}
                </div>
            </div>
        `;
    });
}

// ============================================
// FUNÇÕES GLOBAIS (para onclick)
// ============================================
window.changePage = changePage;
window.closeOrgDetails = closeOrgDetails;
window.editMilitar = editMilitar;
window.deleteMilitar = deleteMilitar;
