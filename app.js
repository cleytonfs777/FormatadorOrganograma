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
    
    // Carregar configurações (deve ser antes de inicializar filtros)
    loadConfigurations();
    
    // Carregar DDQOD
    loadDDQOD();
    
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
    
    // Renderizar página de configurações
    renderConfigurations();
    
    // Event listener para formulário de configuração (apenas uma vez)
    const configForm = document.getElementById('configForm');
    if (configForm && !configForm.dataset.listenerAdded) {
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveConfig();
        });
        configForm.dataset.listenerAdded = 'true';
    }
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
    
    // Inicializar todos os locais das configurações com 0
    getLocaisNomes().forEach(local => {
        unidadeCount[local] = 0;
    });
    
    // Contar militares por local
    flatData.forEach(p => {
        if (p.LOCAL && unidadeCount.hasOwnProperty(p.LOCAL)) {
            unidadeCount[p.LOCAL]++;
        }
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
    
    // Inicializar todas as funções das configurações com 0
    getFuncoesNomes().forEach(funcao => {
        funcaoCount[funcao] = 0;
    });
    
    // Contar pessoas por função
    uniquePessoas.forEach(p => {
        if (p.FUNÇÃO && funcaoCount.hasOwnProperty(p.FUNÇÃO)) {
            funcaoCount[p.FUNÇÃO]++;
        }
    });
    
    const total = uniquePessoas.length;
    const container = document.getElementById('funcaoStats');
    
    // Ordenar por quantidade (decrescente) e mostrar todas
    const sorted = Object.entries(funcaoCount).sort((a, b) => b[1] - a[1]);
    
    container.innerHTML = sorted.map(([funcao, count]) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
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
    
    // Usar todos os locais das configurações
    container.innerHTML = getLocaisNomes().map(local => {
        const unidadeData = data[local] || {};
        
        // Coletar todas as pessoas desta unidade
        const allPessoasUnidade = [];
        Object.values(unidadeData).forEach(pessoas => {
            if (Array.isArray(pessoas)) {
                allPessoasUnidade.push(...pessoas);
            }
        });
        
        // Contar únicos nesta unidade
        const total = getUniqueCount(allPessoasUnidade);
        
        // Contar por classe (usando pessoas únicas)
        const uniquePessoasUnidade = getUniquePessoas(allPessoasUnidade);
        
        // Se não há dados, mostrar todas as classes configuradas com 0
        let classeStats;
        if (Object.keys(unidadeData).length > 0) {
            classeStats = Object.keys(unidadeData).map(classe => {
                const count = uniquePessoasUnidade.filter(p => p.CLASSE === classe).length;
                return `
                    <div class="unit-stat">
                        <span class="unit-stat-label">${classe}</span>
                        <span class="unit-stat-value">${count}</span>
                    </div>
                `;
            }).join('');
        } else {
            // Mostrar mensagem quando não há militares
            classeStats = `<div class="unit-stat" style="color: var(--text-muted); font-style: italic; text-align: center; padding: 1rem;">Nenhum militar cadastrado</div>`;
        }
        
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
    // Popular filtro de Local usando configurações
    createMultiselect('Local', getLocaisNomes());
    
    // Popular filtro de Classe usando configurações
    createMultiselect('Classe', configurations.classes);
    
    // Popular filtro de Função usando configurações
    createMultiselect('Funcao', getFuncoesNomes());
}

function createMultiselect(name, options) {
    const container = document.getElementById(`options${name}`);
    container.innerHTML = '';
    
    options.forEach(option => {
        const div = document.createElement('div');
        div.className = 'multiselect-option';
        div.innerHTML = `
            <input type="checkbox" id="${name}_${option}" value="${option}">
            <label for="${name}_${option}">${option}</label>
        `;
        container.appendChild(div);
        
        // Adicionar evento de mudança
        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', () => {
            updateMultiselectLabel(name);
            applyFilters();
        });
    });
}

function updateMultiselectLabel(name) {
    const checkboxes = document.querySelectorAll(`#options${name} input[type="checkbox"]:checked`);
    const trigger = document.getElementById(`trigger${name}`);
    const label = trigger.querySelector('.multiselect-label');
    
    if (checkboxes.length === 0) {
        label.textContent = 'Selecione...';
    } else if (checkboxes.length === 1) {
        label.textContent = checkboxes[0].value;
    } else {
        label.textContent = `${checkboxes.length} selecionados`;
    }
}

function setupFilterListeners() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearFilters');
    
    searchInput.addEventListener('input', applyFilters);
    
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        // Desmarcar todos os checkboxes
        document.querySelectorAll('.multiselect-option input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        updateMultiselectLabel('Local');
        updateMultiselectLabel('Classe');
        updateMultiselectLabel('Funcao');
        applyFilters();
    });
    
    // Setup multiselect triggers
    setupMultiselectTrigger('Local');
    setupMultiselectTrigger('Classe');
    setupMultiselectTrigger('Funcao');
    
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.multiselect-wrapper')) {
            document.querySelectorAll('.multiselect-dropdown').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
            document.querySelectorAll('.multiselect-trigger').forEach(trigger => {
                trigger.classList.remove('active');
            });
        }
    });
}

function setupMultiselectTrigger(name) {
    const trigger = document.getElementById(`trigger${name}`);
    const dropdown = document.getElementById(`dropdown${name}`);
    const searchInput = dropdown.querySelector('.search-input');
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Fechar outros dropdowns
        document.querySelectorAll('.multiselect-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        document.querySelectorAll('.multiselect-trigger').forEach(t => {
            if (t !== trigger) t.classList.remove('active');
        });
        
        // Toggle este dropdown
        dropdown.classList.toggle('show');
        trigger.classList.toggle('active');
        
        if (dropdown.classList.contains('show')) {
            searchInput.focus();
        }
    });
    
    // Busca dentro do dropdown
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const options = dropdown.querySelectorAll('.multiselect-option');
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            option.style.display = text.includes(term) ? 'flex' : 'none';
        });
    });
    
    // Prevenir que cliques dentro do dropdown o fechem
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Obter valores selecionados dos checkboxes
    const selectedLocais = Array.from(document.querySelectorAll('#optionsLocal input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const selectedClasses = Array.from(document.querySelectorAll('#optionsClasse input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const selectedFuncoes = Array.from(document.querySelectorAll('#optionsFuncao input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    filteredData = flatData.filter(pessoa => {
        const matchSearch = !searchTerm || 
            pessoa.NOME.toLowerCase().includes(searchTerm) ||
            pessoa.NUMERO.toLowerCase().includes(searchTerm) ||
            pessoa['POST/GRAD'].toLowerCase().includes(searchTerm);
        
        const matchLocal = selectedLocais.length === 0 || selectedLocais.includes(pessoa.LOCAL);
        const matchClasse = selectedClasses.length === 0 || selectedClasses.includes(pessoa.CLASSE);
        const matchFuncao = selectedFuncoes.length === 0 || selectedFuncoes.includes(pessoa.FUNÇÃO);
        
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
    
    // Atualizar dropdowns com configurações atuais
    updateFormDropdowns();
    
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
    
    // Construir hierarquia dinamicamente baseada nas configurações
    const locaisConfig = configurations.locais;
    
    // Debug: verificar estrutura dos locais
    console.log('Locais configurados:', locaisConfig);
    
    // Função recursiva para construir a hierarquia
    function buildHierarchy(nomePai) {
        const filhos = locaisConfig
            .filter(l => {
                const localObj = typeof l === 'string' ? { nome: l, pai: null } : l;
                return localObj.pai === nomePai;
            })
            .map(l => {
                const localObj = typeof l === 'string' ? { nome: l, pai: null } : l;
                return {
                    name: localObj.nome,
                    children: buildHierarchy(localObj.nome)
                };
            });
        return filhos.length > 0 ? filhos : undefined;
    }
    
    // Encontrar TODOS os nós raiz (locais sem pai)
    const raizes = locaisConfig.filter(l => {
        const localObj = typeof l === 'string' ? { nome: l, pai: null } : l;
        return !localObj.pai;
    });
    
    console.log('Raízes encontradas:', raizes);
    
    if (raizes.length === 0) {
        wrapper.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">Configure um local raiz (sem pai) nas configurações</p>';
        return;
    }
    
    // Se houver apenas uma raiz, usar estrutura simples
    if (raizes.length === 1) {
        const raizNome = typeof raizes[0] === 'string' ? raizes[0] : raizes[0].nome;
        const hierarchy = {
            name: raizNome,
            children: buildHierarchy(raizNome)
        };
        console.log('Hierarquia construída (raiz única):', hierarchy);
        wrapper.innerHTML = renderOrgNode(hierarchy);
    } else {
        // Se houver múltiplas raízes, criar um container virtual
        const hierarchy = {
            name: 'ORGANIZAÇÃO',
            isVirtual: true,
            children: raizes.map(r => {
                const raizNome = typeof r === 'string' ? r : r.nome;
                return {
                    name: raizNome,
                    children: buildHierarchy(raizNome)
                };
            })
        };
        console.log('Hierarquia construída (múltiplas raízes):', hierarchy);
        wrapper.innerHTML = renderOrgNode(hierarchy);
    }
    
    // Adicionar eventos de clique
    setupOrgClickEvents();
    
    // Adicionar eventos dos botões
    setupOrgButtons();
}

function renderOrgNode(node, level = 0) {
    const nodeData = data[node.name];
    const count = nodeData ? Object.values(nodeData).reduce((sum, arr) => sum + arr.length, 0) : 0;
    
    let html = '<div class="org-node">';
    
    // Se for um nó virtual (para múltiplas raízes), não renderizar a caixa
    if (!node.isVirtual) {
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
    }
    
    // Renderizar filhos
    if (node.children && node.children.length > 0) {
        // Usar classe genérica para qualquer nível
        const childrenClass = 'org-children-level';
        html += `<div class="${childrenClass}" data-level="${level}">`;
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
    
    // Usar todas as funções das configurações ordenadas
    const funcoesOrdenadas = [...configurations.funcoes].sort((a, b) => {
        const ordemA = typeof a === 'string' ? 999 : a.ordem;
        const ordemB = typeof b === 'string' ? 999 : b.ordem;
        return ordemA - ordemB;
    });
    
    funcoesOrdenadas.forEach(funcaoObj => {
        const funcao = typeof funcaoObj === 'string' ? funcaoObj : funcaoObj.nome;
        const cor = typeof funcaoObj === 'string' ? gerarCorAleatoria(funcaoObj) : funcaoObj.cor;
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
            // Determinar a classe CSS
            let funcaoClass = funcao.toLowerCase();
            if (funcao === 'CHEFE' || funcao === 'CMTE') {
                funcaoClass = 'chefe';
            }
            
            html += `
                <div class="org-section">
                    <div class="org-section-header ${funcaoClass}" style="background: ${cor} !important;">
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

// Função auxiliar para gerar hash de string (para cores consistentes)
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
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

// ============================================
// ANÁLISE DDQOD
// ============================================

// Dados previstos no DDQOD
// DDQOD Previsto - agora carregado do localStorage
let ddqodPrevisto = {};
let ddqodInfo = {
    descricao: 'Comparativo entre o efetivo previsto no DDQOD e o efetivo atual',
    ultimaAtualizacao: 'RESOLUÇÃO N.º 1.280, DE 18 DE SETEMBRO DE 2025'
};

// Grupos DDQOD - organiza locais em grupos
let ddqodGrupos = [
    {
        id: 'sdts',
        nome: 'SDTS',
        locais: ['SDTS', 'SDTS1', 'SDTS2', 'SDTS3']
    },
    {
        id: 'nts',
        nome: 'NTS',
        locais: ['NTS', 'NST INFORMATICA', 'NTS CONTRATOS', 'NTS TELECOM']
    }
];

// Categorias DDQOD padrão
const categoriasDDQOD = [
    'TCEL',
    'MAJ',
    'CAP',
    'TEN',
    'OF - QOE',
    'ST/SGT',
    'CB/SD',
    'PR - QPE'
];

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
    
    // Para cada grupo, contar militares dos locais pertencentes a ele
    ddqodGrupos.forEach(grupo => {
        existente[grupo.nome] = {
            'TCEL': 0,
            'MAJ': 0,
            'CAP': 0,
            'TEN': 0,
            'OF - QOE': 0,
            'ST/SGT': 0,
            'CB/SD': 0,
            'PR - QPE': 0
        };
        
        // Filtrar pessoas que estão nos locais deste grupo
        const pessoasDoGrupo = getUniquePessoas(flatData).filter(p => {
            return grupo.locais.includes(p.LOCAL);
        });
        
        pessoasDoGrupo.forEach(pessoa => {
            const categoria = mapPostoToCategory(pessoa['POST/GRAD'], pessoa.CLASSE);
            if (existente[grupo.nome][categoria] !== undefined) {
                existente[grupo.nome][categoria]++;
            }
        });
    });
    
    return existente;
}

function renderAnalise() {
    const existente = calcularExistente();
    
    // Calcular previsto por grupo (somando os locais)
    const previstoGrupos = {};
    ddqodGrupos.forEach(grupo => {
        previstoGrupos[grupo.nome] = {};
        categoriasDDQOD.forEach(cat => {
            previstoGrupos[grupo.nome][cat] = 0;
        });
        
        // Somar os valores de cada local do grupo
        grupo.locais.forEach(local => {
            if (ddqodPrevisto[local]) {
                Object.keys(ddqodPrevisto[local]).forEach(cat => {
                    previstoGrupos[grupo.nome][cat] = (previstoGrupos[grupo.nome][cat] || 0) + (ddqodPrevisto[local][cat] || 0);
                });
            }
        });
    });
    
    // Calcular totais
    let totalPrevisto = 0;
    let totalExistente = 0;
    let totalDeficit = 0;
    let totalExcedente = 0;
    
    Object.keys(previstoGrupos).forEach(grupo => {
        Object.keys(previstoGrupos[grupo]).forEach(cat => {
            const prev = previstoGrupos[grupo][cat];
            const exist = (existente[grupo] && existente[grupo][cat]) || 0;
            
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
    
    // Renderizar análise por grupo
    const container = document.getElementById('analiseSections');
    container.innerHTML = '';
    
    ddqodGrupos.forEach(grupo => {
        const previstoGrupo = previstoGrupos[grupo.nome];
        const existenteGrupo = existente[grupo.nome] || {};
        
        let deficitGrupo = 0;
        let excedenteGrupo = 0;
        
        const itemsHTML = Object.keys(previstoGrupo).map(categoria => {
            const prev = previstoGrupo[categoria];
            const exist = existenteGrupo[categoria] || 0;
            const diff = exist - prev;
            
            if (diff < 0) deficitGrupo += Math.abs(diff);
            if (diff > 0) excedenteGrupo += diff;
            
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
        
        let grupoStatus = 'ok';
        let grupoStatusText = 'Completo';
        if (deficitGrupo > 0) {
            grupoStatus = 'deficit';
            grupoStatusText = `Déficit de ${deficitGrupo}`;
        } else if (excedenteGrupo > 0) {
            grupoStatus = 'excedente';
            grupoStatusText = `Excedente de ${excedenteGrupo}`;
        }
        
        container.innerHTML += `
            <div class="analise-section">
                <div class="analise-section-header">
                    <h2 class="analise-section-title">
                        <i class="fas fa-layer-group"></i>
                        ${grupo.nome}
                    </h2>
                    <div class="analise-section-status">
                        <div class="status-badge ${grupoStatus}">
                            <i class="fas fa-${grupoStatus === 'ok' ? 'check-circle' : grupoStatus === 'deficit' ? 'exclamation-circle' : 'info-circle'}"></i>
                            ${grupoStatusText}
                        </div>
                    </div>
                </div>
                <div class="analise-section-subtitle" style="padding: 0.5rem 1.5rem; color: var(--text-secondary); font-size: 0.85rem; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
                    <i class="fas fa-map-marker-alt"></i> Locais: ${grupo.locais.join(', ')}
                </div>
                <div class="analise-grid">
                    ${itemsHTML}
                </div>
            </div>
        `;
    });
}

// ============================================
// GERENCIAMENTO DDQOD
// ============================================

// Carregar DDQOD do localStorage
function loadDDQOD() {
    const savedDDQOD = localStorage.getItem('ddqodPrevisto');
    const savedInfo = localStorage.getItem('ddqodInfo');
    const savedGrupos = localStorage.getItem('ddqodGrupos');
    
    if (savedGrupos) {
        ddqodGrupos = JSON.parse(savedGrupos);
    }
    
    if (savedDDQOD) {
        ddqodPrevisto = JSON.parse(savedDDQOD);
    } else {
        // Valores padrão iniciais
        ddqodPrevisto = {
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
        saveDDQODToStorage();
    }
    
    if (savedInfo) {
        ddqodInfo = JSON.parse(savedInfo);
    }
    
    // Atualizar textos na página
    updateDDQODTexts();
}

// Salvar DDQOD no localStorage
function saveDDQODToStorage() {
    localStorage.setItem('ddqodPrevisto', JSON.stringify(ddqodPrevisto));
    localStorage.setItem('ddqodInfo', JSON.stringify(ddqodInfo));
    localStorage.setItem('ddqodGrupos', JSON.stringify(ddqodGrupos));
}

// Atualizar textos na página
function updateDDQODTexts() {
    const descricaoEl = document.getElementById('ddqodDescricao');
    const atualizacaoEl = document.getElementById('ddqodUltimaAtualizacao');
    
    if (descricaoEl) {
        descricaoEl.textContent = ddqodInfo.descricao;
    }
    
    if (atualizacaoEl) {
        atualizacaoEl.innerHTML = `<i class="fas fa-calendar-alt"></i> Última atualização: ${ddqodInfo.ultimaAtualizacao}`;
    }
}

// Abrir modal de edição do DDQOD
function openDDQODModal() {
    const modal = document.getElementById('ddqodModal');
    const descricaoInput = document.getElementById('ddqodDescricaoInput');
    const atualizacaoInput = document.getElementById('ddqodUltimaAtualizacaoInput');
    const gruposContainer = document.getElementById('ddqodGruposContainer');
    const container = document.getElementById('ddqodLocaisContainer');
    
    // Preencher informações gerais
    descricaoInput.value = ddqodInfo.descricao;
    atualizacaoInput.value = ddqodInfo.ultimaAtualizacao;
    
    // Renderizar lista de grupos
    renderDDQODGrupos();
    
    // Renderizar formulário por grupo, mas com cada local separado
    container.innerHTML = ddqodGrupos.map(grupo => {
        // Calcular total do grupo
        let totalGrupo = 0;
        grupo.locais.forEach(local => {
            Object.keys(ddqodPrevisto[local] || {}).forEach(cat => {
                totalGrupo += ddqodPrevisto[local][cat] || 0;
            });
        });
        
        return `
            <div class="ddqod-grupo-section" style="margin-bottom: 2.5rem; padding: 1.5rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border-left: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-layer-group"></i> Grupo: ${grupo.nome}
                    </h4>
                    <span style="font-size: 0.85rem; color: var(--text-secondary); background: white; padding: 4px 12px; border-radius: 12px;">
                        ${grupo.locais.length} ${grupo.locais.length === 1 ? 'local' : 'locais'} • Total: ${totalGrupo}
                    </span>
                </div>
                
                ${grupo.locais.map((local, localIndex) => {
                    const dados = ddqodPrevisto[local] || {};
                    let totalLocal = 0;
                    Object.values(dados).forEach(v => totalLocal += v || 0);
                    
                    return `
                        <div class="ddqod-local-section" style="margin-bottom: ${localIndex < grupo.locais.length - 1 ? '1.5rem' : '0'}; padding: 1.25rem; background: white; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h5 style="margin: 0; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem; font-size: 1rem;">
                                    <i class="fas fa-map-marker-alt"></i> ${local}
                                </h5>
                                <span style="font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 2px 10px; border-radius: 10px;">
                                    Total: ${totalLocal}
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
                                ${categoriasDDQOD.map(cat => `
                                    <div class="form-group" style="margin: 0;">
                                        <label for="ddqod_${local}_${cat}" style="font-size: 0.85rem; font-weight: 500; color: var(--text-secondary);">${cat}:</label>
                                        <input type="number" 
                                               id="ddqod_${local}_${cat}" 
                                               class="form-control" 
                                               min="0" 
                                               value="${dados[cat] || 0}"
                                               style="text-align: center; font-size: 0.9rem; padding: 8px;">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');
    
    modal.style.display = 'block';
}

// Fechar modal de edição do DDQOD
function closeDDQODModal() {
    const modal = document.getElementById('ddqodModal');
    modal.style.display = 'none';
}

// Salvar DDQOD
function saveDDQOD() {
    const descricaoInput = document.getElementById('ddqodDescricaoInput');
    const atualizacaoInput = document.getElementById('ddqodUltimaAtualizacaoInput');
    
    // Salvar informações gerais
    ddqodInfo.descricao = descricaoInput.value.trim();
    ddqodInfo.ultimaAtualizacao = atualizacaoInput.value.trim();
    
    // Salvar dados por local (não por grupo)
    const novoDDQOD = {};
    
    ddqodGrupos.forEach(grupo => {
        grupo.locais.forEach(local => {
            novoDDQOD[local] = {};
            categoriasDDQOD.forEach(cat => {
                const inputId = `ddqod_${local}_${cat}`;
                const input = document.getElementById(inputId);
                if (input) {
                    novoDDQOD[local][cat] = parseInt(input.value) || 0;
                }
            });
        });
    });
    
    ddqodPrevisto = novoDDQOD;
    
    // Salvar no localStorage
    saveDDQODToStorage();
    
    // Atualizar textos na página
    updateDDQODTexts();
    
    // Atualizar análise
    renderAnalise();
    
    // Fechar modal
    closeDDQODModal();
    
    showToast('DDQOD atualizado com sucesso!', 'success', 'Sucesso');
}

// ============================================
// GESTÃO DE GRUPOS DDQOD
// ============================================

// Renderizar lista de grupos
function renderDDQODGrupos() {
    const container = document.getElementById('ddqodGruposContainer');
    
    if (ddqodGrupos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">Nenhum grupo criado. Clique em "Novo Grupo" para começar.</p>';
        return;
    }
    
    container.innerHTML = ddqodGrupos.map((grupo, index) => `
        <div class="config-item" style="margin-bottom: 0.75rem;">
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                    <i class="fas fa-layer-group" style="color: var(--primary);"></i>
                    <span class="config-item-name" style="font-weight: 600;">${grupo.nome}</span>
                    <span style="font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 2px 8px; border-radius: 10px;">
                        ${grupo.locais.length} ${grupo.locais.length === 1 ? 'local' : 'locais'}
                    </span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 2rem;">
                    <i class="fas fa-map-marker-alt"></i> ${grupo.locais.join(', ') || 'Nenhum local'}
                </div>
            </div>
            <div class="config-item-actions">
                <button class="btn-config-action edit" onclick="editGrupo(${index})" title="Editar Grupo">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-config-action delete" onclick="deleteGrupo(${index})" title="Excluir Grupo">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Abrir modal de grupo (criar/editar)
let currentGrupoIndex = null;

function openGrupoModal(index = null) {
    currentGrupoIndex = index;
    const isEdit = index !== null;
    
    const grupo = isEdit ? ddqodGrupos[index] : { nome: '', locais: [] };
    
    const locaisDisponiveis = getLocaisNomes();
    
    const html = `
        <div id="grupoModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-layer-group"></i> ${isEdit ? 'Editar' : 'Novo'} Grupo</h2>
                    <button class="btn-close" onclick="closeGrupoModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="grupoNome">Nome do Grupo:</label>
                        <input type="text" id="grupoNome" class="form-control" value="${grupo.nome}" placeholder="Ex: SDTS, NTS, etc.">
                    </div>
                    <div class="form-group">
                        <label>Locais do Grupo:</label>
                        <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem;">
                            ${locaisDisponiveis.map(local => `
                                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; cursor: pointer; border-radius: var(--radius-sm); transition: background 0.2s;" 
                                       onmouseover="this.style.background='var(--bg-secondary)'" 
                                       onmouseout="this.style.background='transparent'">
                                    <input type="checkbox" 
                                           value="${local}" 
                                           ${grupo.locais.includes(local) ? 'checked' : ''}
                                           style="cursor: pointer;">
                                    <span>${local}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeGrupoModal()">Cancelar</button>
                    <button class="btn-primary" onclick="saveGrupo()"><i class="fas fa-save"></i> Salvar</button>
                </div>
            </div>
        </div>
    `;
    
    // Remover modal existente se houver
    const existingModal = document.getElementById('grupoModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeGrupoModal() {
    const modal = document.getElementById('grupoModal');
    if (modal) {
        modal.remove();
    }
    currentGrupoIndex = null;
}

function saveGrupo() {
    const nomeInput = document.getElementById('grupoNome');
    const checkboxes = document.querySelectorAll('#grupoModal input[type="checkbox"]:checked');
    
    const nome = nomeInput.value.trim();
    const locais = Array.from(checkboxes).map(cb => cb.value);
    
    if (!nome) {
        showToast('Por favor, informe o nome do grupo', 'error', 'Erro');
        return;
    }
    
    // Verificar se já existe um grupo com esse nome (exceto o próprio em edição)
    const nomeExiste = ddqodGrupos.some((g, idx) => 
        g.nome.toUpperCase() === nome.toUpperCase() && idx !== currentGrupoIndex
    );
    
    if (nomeExiste) {
        showToast('Já existe um grupo com este nome', 'error', 'Erro');
        return;
    }
    
    const grupoData = {
        id: nome.toLowerCase().replace(/\s+/g, '_'),
        nome: nome,
        locais: locais
    };
    
    if (currentGrupoIndex !== null) {
        // Editar
        const nomeAntigo = ddqodGrupos[currentGrupoIndex].nome;
        ddqodGrupos[currentGrupoIndex] = grupoData;
        
        // Atualizar ddqodPrevisto se o nome mudou
        if (nomeAntigo !== nome && ddqodPrevisto[nomeAntigo]) {
            ddqodPrevisto[nome] = ddqodPrevisto[nomeAntigo];
            delete ddqodPrevisto[nomeAntigo];
        }
        
        showToast('Grupo atualizado com sucesso!', 'success', 'Sucesso');
    } else {
        // Criar
        ddqodGrupos.push(grupoData);
        
        // Inicializar ddqodPrevisto para o novo grupo
        ddqodPrevisto[nome] = {};
        categoriasDDQOD.forEach(cat => {
            ddqodPrevisto[nome][cat] = 0;
        });
        
        showToast('Grupo criado com sucesso!', 'success', 'Sucesso');
    }
    
    saveDDQODToStorage();
    renderDDQODGrupos();
    closeGrupoModal();
    
    // Atualizar o modal de DDQOD se estiver aberto
    const ddqodModal = document.getElementById('ddqodModal');
    if (ddqodModal && ddqodModal.style.display === 'block') {
        openDDQODModal();
    }
}

function editGrupo(index) {
    openGrupoModal(index);
}

function deleteGrupo(index) {
    const grupo = ddqodGrupos[index];
    
    if (!confirm(`Tem certeza que deseja excluir o grupo "${grupo.nome}"?\n\nIsso também excluirá os dados de previsto deste grupo.`)) {
        return;
    }
    
    // Remover grupo
    ddqodGrupos.splice(index, 1);
    
    // Remover dados de previsto
    delete ddqodPrevisto[grupo.nome];
    
    saveDDQODToStorage();
    renderDDQODGrupos();
    showToast('Grupo excluído com sucesso!', 'success', 'Sucesso');
    
    // Atualizar o formulário de previsto
    openDDQODModal();
}

// Exportar DDQOD para JSON
function exportDDQOD() {
    const dataToExport = {
        info: ddqodInfo,
        grupos: ddqodGrupos,
        previsto: ddqodPrevisto,
        exportDate: new Date().toISOString(),
        version: '2.0'
    };
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ddqod_previsto_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('DDQOD exportado com sucesso!', 'success', 'Sucesso');
}

// Importar DDQOD de JSON
function importDDQOD(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validar estrutura básica
            if (!data.previsto || typeof data.previsto !== 'object') {
                throw new Error('Arquivo JSON inválido: estrutura "previsto" não encontrada');
            }
            
            // Importar dados
            if (data.info) {
                ddqodInfo = data.info;
            }
            if (data.grupos) {
                ddqodGrupos = data.grupos;
            }
            ddqodPrevisto = data.previsto;
            
            // Salvar no localStorage
            saveDDQODToStorage();
            
            // Atualizar interface
            updateDDQODTexts();
            renderAnalise();
            
            showToast(`DDQOD importado com sucesso!${data.exportDate ? ' (Exportado em: ' + new Date(data.exportDate).toLocaleDateString() + ')' : ''}`, 'success', 'Sucesso');
        } catch (error) {
            console.error('Erro ao importar DDQOD:', error);
            showToast('Erro ao importar arquivo JSON: ' + error.message, 'error', 'Erro');
        }
    };
    reader.readAsText(file);
    
    // Limpar input para permitir reimportar o mesmo arquivo
    event.target.value = '';
}

// Importar DDQOD de XLSX (planilha modelo)
function importDDQODXLSX(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Tentar ler informações gerais (opcional)
            if (workbook.Sheets['Info']) {
                const infoRows = XLSX.utils.sheet_to_json(workbook.Sheets['Info'], { header: 1, defval: '' });
                infoRows.forEach(r => {
                    if (!r || r.length === 0) return;
                    const key = String(r[0]).toLowerCase();
                    if (key.includes('descri')) ddqodInfo.descricao = r[1] || ddqodInfo.descricao;
                    if (key.includes('ultima') || key.includes('atual')) ddqodInfo.ultimaAtualizacao = r[1] || ddqodInfo.ultimaAtualizacao;
                });
            }

            // Tentar ler grupos (opcional)
            if (workbook.Sheets['Grupos']) {
                const groupsRows = XLSX.utils.sheet_to_json(workbook.Sheets['Grupos'], { defval: '' });
                const newGroups = [];
                groupsRows.forEach(row => {
                    const nome = row['NOME'] || row['Grupo'] || row['GRUPO'] || row['nome'];
                    const locaisField = row['LOCAIS'] || row['Locais'] || row['LOCAIS/LOCALS'] || row['LOCALS'] || row['LOCAL'] || row['local'] || '';
                    if (nome) {
                        const locais = String(locaisField).split(/[;,]/).map(s => s.trim()).filter(Boolean);
                        newGroups.push({ id: String(nome).toLowerCase().replace(/\s+/g, '_'), nome: String(nome), locais: locais });
                    }
                });
                if (newGroups.length > 0) ddqodGrupos = newGroups;
            }

            // Ler dados previstos - tentar aba 'Previsto' ou primeira aba disponível
            let previstoSheet = workbook.Sheets['Previsto'];
            if (!previstoSheet) {
                // Tentar primeira aba se "Previsto" não existir
                const firstSheetName = workbook.SheetNames[0];
                if (firstSheetName) {
                    previstoSheet = workbook.Sheets[firstSheetName];
                    console.log(`Aba "Previsto" não encontrada. Usando primeira aba: "${firstSheetName}"`);
                } else {
                    throw new Error('Nenhuma aba encontrada no arquivo XLSX. Use o modelo fornecido (gerar_modelo_ddqod.html).');
                }
            }

            const previstoRows = XLSX.utils.sheet_to_json(previstoSheet, { defval: '' });
            const novoPrevisto = {};
            let registrosImportados = 0;

            previstoRows.forEach(r => {
                // Tentar múltiplos nomes de colunas
                const local = r['LOCAL'] || r['Local'] || r['local'] || r['UNIDADE'] || r['Unidade'] || r['unidade'] || r['Grupo'] || r['GRUPO'];
                const categoria = r['CATEGORIA'] || r['Categoria'] || r['categoria'] || r['POSTO'] || r['Posto'] || r['posto'] || r['POSTO/GRAD'] || r['Posto/Grad'] || r['POSTO/GRADUAÇÃO'];
                const quantidadeRaw = r['QUANTIDADE'] || r['Quantidade'] || r['quantidade'] || r['QTD'] || r['Qtd'] || r['qtd'] || r['VALOR'] || r['Quantidade Prevista'];
                const quantidade = Number(quantidadeRaw) || 0;

                if (!local || !categoria || quantidade === 0) return;

                if (!novoPrevisto[local]) novoPrevisto[local] = {};
                novoPrevisto[local][categoria] = (novoPrevisto[local][categoria] || 0) + quantidade;
                registrosImportados++;
            });

            if (registrosImportados === 0) {
                throw new Error('Nenhum dado válido encontrado. Verifique se as colunas estão nomeadas como: LOCAL, CATEGORIA, QUANTIDADE');
            }

            ddqodPrevisto = novoPrevisto;

            // Salvar no localStorage
            saveDDQODToStorage();
            
            // Atualizar interface
            updateDDQODTexts();
            renderAnalise();

            showToast(`DDQOD importado com sucesso! ${registrosImportados} registros carregados.`, 'success', 'Sucesso');
        } catch (error) {
            console.error('Erro ao importar DDQOD (XLSX):', error);
            showToast('Erro ao importar arquivo XLSX: ' + error.message, 'error', 'Erro');
        }
    };
    reader.readAsArrayBuffer(file);

    // Limpar input para permitir reimportar o mesmo arquivo
    event.target.value = '';
}

// ============================================
// GERENCIAMENTO DE CONFIGURAÇÕES
// ============================================

// Configurações padrão
let configurations = {
    locais: [], // Array de objetos: [{nome: 'SDTS', pai: null}, {nome: 'SDTS1', pai: 'SDTS'}, ...]
    funcoes: [], // Array de objetos: [{nome: 'CHEFE', ordem: 1, cor: '#38a169'}, ...]
    classes: [],
    postos: []
};

// Carregar configurações do localStorage
function loadConfigurations() {
    const saved = localStorage.getItem('efetivo_configs');
    if (saved) {
        configurations = JSON.parse(saved);
        
        // Migrar formato antigo de locais (array de strings) para novo (array de objetos)
        if (configurations.locais.length > 0 && typeof configurations.locais[0] === 'string') {
            configurations.locais = configurations.locais.map(nome => {
                // Definir hierarquia padrão baseada no nome
                let pai = null;
                if (nome.startsWith('SDTS') && nome !== 'SDTS') {
                    pai = 'SDTS';
                } else if ((nome.startsWith('NTS') || nome.startsWith('NST')) && nome !== 'NTS') {
                    pai = 'NTS';
                }
                return { nome: nome, pai: pai };
            });
            saveConfigurations();
        }
        
        // Migrar formato antigo de funções (array de strings) para novo (array de objetos)
        if (configurations.funcoes.length > 0 && typeof configurations.funcoes[0] === 'string') {
            configurations.funcoes = configurations.funcoes.map((nome, index) => ({
                nome: nome,
                ordem: index + 1,
                cor: getCoresPadrao()[nome] || gerarCorAleatoria(nome)
            }));
            saveConfigurations();
        }
    } else {
        // Extrair valores únicos dos dados existentes
        extractDefaultConfigurations();
        saveConfigurations();
    }
}

// Função auxiliar para gerar hash de string (para cores consistentes)
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

// Cores padrão para funções conhecidas (tons mais suaves)
function getCoresPadrao() {
    return {
        'CHEFE': '#48bb78',   // Verde suave
        'CMTE': '#48bb78',    // Verde suave
        'ADJ': '#4299e1',     // Azul suave
        'AUX': '#a0aec0'      // Cinza suave
    };
}

// Gerar cor aleatória suave baseada no nome
function gerarCorAleatoria(nome) {
    const hue = Math.abs(hashCode(nome)) % 360;
    // Saturação 60% e luminosidade 65% para cores suaves
    return `hsl(${hue}, 60%, 65%)`;
}

// Extrair configurações dos dados existentes
function extractDefaultConfigurations() {
    const locaisSet = new Set();
    const funcoesSet = new Set();
    const classesSet = new Set();
    const postosSet = new Set();
    
    flatData.forEach(pessoa => {
        if (pessoa.LOCAL) locaisSet.add(pessoa.LOCAL);
        if (pessoa.FUNÇÃO) funcoesSet.add(pessoa.FUNÇÃO);
        if (pessoa.CLASSE) classesSet.add(pessoa.CLASSE);
        if (pessoa['POST/GRAD']) postosSet.add(pessoa['POST/GRAD']);
    });
    
    // Criar locais com hierarquia padrão
    const locaisArray = Array.from(locaisSet).sort();
    configurations.locais = locaisArray.map(nome => {
        let pai = null;
        // Definir hierarquia padrão baseada no nome
        if (nome.startsWith('SDTS') && nome !== 'SDTS') {
            pai = 'SDTS';
        } else if ((nome.startsWith('NTS') || nome.startsWith('NST')) && nome !== 'NTS') {
            pai = 'NTS';
        }
        return { nome: nome, pai: pai };
    });
    
    // Criar funções com ordem e cor
    const funcoesArray = Array.from(funcoesSet).sort();
    const coresPadrao = getCoresPadrao();
    const ordemPrioritaria = ['CHEFE', 'CMTE', 'ADJ', 'AUX'];
    
    configurations.funcoes = funcoesArray.map((nome, index) => {
        const ordemPrioridade = ordemPrioritaria.indexOf(nome);
        return {
            nome: nome,
            ordem: ordemPrioridade >= 0 ? ordemPrioridade + 1 : ordemPrioritaria.length + index + 1,
            cor: coresPadrao[nome] || gerarCorAleatoria(nome)
        };
    });
    
    // Ordenar funções pela ordem
    configurations.funcoes.sort((a, b) => a.ordem - b.ordem);
    
    configurations.classes = Array.from(classesSet).sort();
    configurations.postos = Array.from(postosSet).sort();
}

// Salvar configurações no localStorage
function saveConfigurations() {
    localStorage.setItem('efetivo_configs', JSON.stringify(configurations));
}

// Obter apenas os nomes dos locais (compatibilidade com código existente)
function getLocaisNomes() {
    return configurations.locais.map(l => typeof l === 'string' ? l : l.nome);
}

// Obter local completo (com pai) por nome
function getLocalConfig(nome) {
    const local = configurations.locais.find(l => 
        (typeof l === 'string' ? l : l.nome) === nome
    );
    if (typeof local === 'string') {
        return { nome: local, pai: null };
    }
    return local || { nome: nome, pai: null };
}

// Obter apenas os nomes das funções (compatibilidade com código existente)
function getFuncoesNomes() {
    return configurations.funcoes.map(f => typeof f === 'string' ? f : f.nome);
}

// Obter função completa (com ordem e cor) por nome
function getFuncaoConfig(nome) {
    const funcao = configurations.funcoes.find(f => 
        (typeof f === 'string' ? f : f.nome) === nome
    );
    if (typeof funcao === 'string') {
        return { nome: funcao, ordem: 999, cor: gerarCorAleatoria(funcao) };
    }
    return funcao || { nome: nome, ordem: 999, cor: gerarCorAleatoria(nome) };
}

// Renderizar todas as configurações
function renderConfigurations() {
    renderConfigList('locais', 'Local');
    renderConfigList('funcoes', 'Função');
    renderConfigList('classes', 'Classe');
    renderConfigList('postos', 'Posto/Graduação');
}

// Renderizar lista de configuração
function renderConfigList(type, label) {
    const listElement = document.getElementById(`${type}List`);
    if (!listElement) return;
    
    const items = configurations[type];
    
    if (items.length === 0) {
        listElement.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">Nenhum ${label.toLowerCase()} cadastrado</p>`;
        return;
    }
    
    // Mapear tipo plural para singular
    const typeMap = {
        'locais': 'local',
        'funcoes': 'funcao',
        'classes': 'classe',
        'postos': 'posto'
    };
    const singularType = typeMap[type];
    
    // Se for funções, renderizar com ordem e cor
    if (type === 'funcoes') {
        listElement.innerHTML = items.map((funcaoObj, index) => {
            const nome = typeof funcaoObj === 'string' ? funcaoObj : funcaoObj.nome;
            const ordem = typeof funcaoObj === 'string' ? index + 1 : funcaoObj.ordem;
            const cor = typeof funcaoObj === 'string' ? gerarCorAleatoria(funcaoObj) : funcaoObj.cor;
            
            return `
                <div class="config-item funcao-item" draggable="true" data-index="${index}">
                    <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
                        <span class="funcao-ordem" title="Ordem de exibição">${ordem}</span>
                        <span class="funcao-cor" style="background: ${cor};" title="Cor no organograma"></span>
                        <span class="config-item-name">${nome}</span>
                    </div>
                    <div class="config-item-actions">
                        <button class="btn-config-action move-up" onclick="moveFuncao(${index}, 'up')" title="Mover para cima" ${index === 0 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <button class="btn-config-action move-down" onclick="moveFuncao(${index}, 'down')" title="Mover para baixo" ${index === items.length - 1 ? 'disabled' : ''}>
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="btn-config-action edit" onclick="editConfig('${singularType}', '${escapeHtml(nome)}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-config-action delete" onclick="deleteConfig('${type}', '${escapeHtml(nome)}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else if (type === 'locais') {
        // Renderização especial para locais (mostra hierarquia)
        listElement.innerHTML = items.map(localObj => {
            const nome = typeof localObj === 'string' ? localObj : localObj.nome;
            const pai = typeof localObj === 'string' ? null : localObj.pai;
            const hierarquiaInfo = pai ? ` <span style="color: var(--text-secondary); font-size: 0.85em;">(filho de ${pai})</span>` : ' <span style="color: var(--text-secondary); font-size: 0.85em;">(raiz)</span>';
            
            return `
                <div class="config-item">
                    <span class="config-item-name">${nome}${hierarquiaInfo}</span>
                    <div class="config-item-actions">
                        <button class="btn-config-action edit" onclick="editConfig('${singularType}', '${escapeHtml(nome)}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-config-action delete" onclick="deleteConfig('${type}', '${escapeHtml(nome)}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        // Renderização normal para outros tipos
        listElement.innerHTML = items.map(item => `
            <div class="config-item">
                <span class="config-item-name">${item}</span>
                <div class="config-item-actions">
                    <button class="btn-config-action edit" onclick="editConfig('${singularType}', '${escapeHtml(item)}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-config-action delete" onclick="deleteConfig('${type}', '${escapeHtml(item)}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Escape HTML para prevenir XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Abrir modal de configuração
function openConfigModal(type, value = '') {
    const modal = document.getElementById('configModal');
    const title = document.getElementById('configModalTitle');
    const label = document.getElementById('configValueLabel');
    const input = document.getElementById('configValue');
    const typeInput = document.getElementById('configType');
    const oldValueInput = document.getElementById('configOldValue');
    const corGroup = document.getElementById('configCorGroup');
    const corInput = document.getElementById('configCor');
    const paiGroup = document.getElementById('configPaiGroup');
    const paiSelect = document.getElementById('configPai');
    
    const labels = {
        local: 'Local',
        funcao: 'Função',
        classe: 'Classe',
        posto: 'Posto/Graduação'
    };
    
    const labelText = labels[type];
    title.textContent = value ? `Editar ${labelText}` : `Adicionar ${labelText}`;
    label.textContent = `Nome do ${labelText}:`;
    input.value = value;
    typeInput.value = type;
    oldValueInput.value = value;
    
    // Mostrar campo de cor apenas para funções
    if (type === 'funcao') {
        corGroup.style.display = 'block';
        paiGroup.style.display = 'none';
        // Se estiver editando, buscar a cor atual
        if (value) {
            const funcaoConfig = getFuncaoConfig(value);
            corInput.value = funcaoConfig.cor;
        } else {
            corInput.value = '#4299e1';
        }
    } else if (type === 'local') {
        // Mostrar campo de pai para locais
        paiGroup.style.display = 'block';
        corGroup.style.display = 'none';
        
        // Popular dropdown de pai
        const locaisNomes = getLocaisNomes();
        paiSelect.innerHTML = '<option value="">-- Nenhum (raiz) --</option>' +
            locaisNomes
                .filter(l => l !== value) // Excluir o próprio local
                .map(l => `<option value="${l}">${l}</option>`)
                .join('');
        
        // Se estiver editando, definir o pai atual
        if (value) {
            const localConfig = getLocalConfig(value);
            paiSelect.value = localConfig.pai || '';
        }
    } else {
        corGroup.style.display = 'none';
        paiGroup.style.display = 'none';
    }
    
    modal.style.display = 'block';
    setTimeout(() => input.focus(), 100);
}

// Fechar modal de configuração
function closeConfigModal() {
    const modal = document.getElementById('configModal');
    modal.style.display = 'none';
    // Limpar apenas o campo de input visível, não os campos hidden
    document.getElementById('configValue').value = '';
}

// Salvar configuração
function saveConfig() {
    const typeInput = document.getElementById('configType').value;
    const oldValue = document.getElementById('configOldValue').value;
    const newValue = document.getElementById('configValue').value.trim();
    
    console.log('saveConfig chamado:', { typeInput, oldValue, newValue });
    
    if (!newValue) {
        showToast('Por favor, preencha o campo obrigatório', 'error', 'Erro de Validação');
        return;
    }
    
    const typeMap = {
        local: 'locais',
        funcao: 'funcoes',
        classe: 'classes',
        posto: 'postos'
    };
    
    const configType = typeMap[typeInput];
    
    if (!configType || !configurations[configType]) {
        console.error('Tipo de configuração inválido:', typeInput);
        showToast('Erro ao salvar configuração', 'error');
        return;
    }
    
    // Tratamento especial para funções (com cor e ordem)
    if (typeInput === 'funcao') {
        const corValue = document.getElementById('configCor').value;
        
        // Verificar se já existe
        const nomeExistente = configurations.funcoes.find(f => 
            (typeof f === 'string' ? f : f.nome) === newValue
        );
        if (nomeExistente && newValue !== oldValue) {
            showToast('Este valor já existe na lista', 'warning', 'Atenção');
            return;
        }
        
        if (oldValue && oldValue.length > 0) {
            // Edição
            const index = configurations.funcoes.findIndex(f => 
                (typeof f === 'string' ? f : f.nome) === oldValue
            );
            if (index !== -1) {
                const ordemAtual = typeof configurations.funcoes[index] === 'string' ? index + 1 : configurations.funcoes[index].ordem;
                configurations.funcoes[index] = {
                    nome: newValue,
                    ordem: ordemAtual,
                    cor: corValue
                };
                updateMilitaresWithConfig(typeInput, oldValue, newValue);
            }
            showToast('Configuração atualizada com sucesso!', 'success', 'Sucesso');
        } else {
            // Novo item
            const novaOrdem = configurations.funcoes.length + 1;
            configurations.funcoes.push({
                nome: newValue,
                ordem: novaOrdem,
                cor: corValue
            });
            showToast('Configuração adicionada com sucesso!', 'success', 'Sucesso');
        }
    } else {
        // Tratamento especial para locais (com pai)
        if (typeInput === 'local') {
            const paiValue = document.getElementById('configPai').value;
            
            // Verificar se já existe
            const locaisNomes = getLocaisNomes();
            if (locaisNomes.includes(newValue) && newValue !== oldValue) {
                showToast('Este valor já existe na lista', 'warning', 'Atenção');
                return;
            }
            
            // Verificar ciclo (não pode ser pai de si mesmo, nem criar ciclo)
            if (paiValue && paiValue === newValue) {
                showToast('Um local não pode ser pai de si mesmo', 'error', 'Erro');
                return;
            }
            
            // Verificar se criaria ciclo (simplificado - apenas 1 nível)
            if (paiValue && oldValue) {
                const paiConfig = getLocalConfig(paiValue);
                if (paiConfig && paiConfig.pai === oldValue) {
                    showToast('Esta hierarquia criaria um ciclo', 'error', 'Erro');
                    return;
                }
            }
            
            if (oldValue && oldValue.length > 0) {
                // Edição
                const index = configurations.locais.findIndex(l => 
                    (typeof l === 'string' ? l : l.nome) === oldValue
                );
                if (index !== -1) {
                    configurations.locais[index] = {
                        nome: newValue,
                        pai: paiValue || null
                    };
                    updateMilitaresWithConfig(typeInput, oldValue, newValue);
                    
                    // Atualizar filhos que referenciam este local
                    configurations.locais.forEach(l => {
                        if (typeof l === 'object' && l.pai === oldValue) {
                            l.pai = newValue;
                        }
                    });
                }
                showToast('Configuração atualizada com sucesso!', 'success', 'Sucesso');
            } else {
                // Novo item
                configurations.locais.push({
                    nome: newValue,
                    pai: paiValue || null
                });
                showToast('Configuração adicionada com sucesso!', 'success', 'Sucesso');
            }
        } else {
            // Tratamento normal para outros tipos (classes, postos)
            const configArr = configurations[configType];
            const valoresExistentes = Array.isArray(configArr) && typeof configArr[0] === 'string' 
                ? configArr 
                : configArr.map(x => typeof x === 'string' ? x : x.nome);
            
            if (valoresExistentes.includes(newValue) && newValue !== oldValue) {
                showToast('Este valor já existe na lista', 'warning', 'Atenção');
                return;
            }
            
            if (oldValue && oldValue.length > 0) {
                // Edição
                const index = valoresExistentes.indexOf(oldValue);
                if (index !== -1) {
                    configurations[configType][index] = newValue;
                    updateMilitaresWithConfig(typeInput, oldValue, newValue);
                }
                showToast('Configuração atualizada com sucesso!', 'success', 'Sucesso');
            } else {
                // Novo item
                configurations[configType].push(newValue);
                configurations[configType].sort();
                showToast('Configuração adicionada com sucesso!', 'success', 'Sucesso');
            }
        }
    }
    
    saveConfigurations();
    renderConfigurations();
    updateFormDropdowns();
    closeConfigModal();
    
    // Atualizar modal de DDQOD se estiver aberto
    const ddqodModal = document.getElementById('ddqodModal');
    if (ddqodModal && ddqodModal.style.display === 'block') {
        openDDQODModal();
    }
    
    // Atualizar dashboard e filtros sempre que houver alteração
    updateAllViews();
}

// Editar configuração
function editConfig(type, value) {
    openConfigModal(type, value);
}

// Excluir configuração
function deleteConfig(type, value) {
    const typeMap = {
        locais: 'Local',
        funcoes: 'Função',
        classes: 'Classe',
        postos: 'Posto/Graduação'
    };
    
    const label = typeMap[type];
    
    // Verificação especial para locais: não pode excluir se tem filhos
    if (type === 'locais') {
        const temFilhos = configurations.locais.some(l => {
            const localObj = typeof l === 'string' ? { nome: l, pai: null } : l;
            return localObj.pai === value;
        });
        
        if (temFilhos) {
            showToast(`Não é possível excluir. Este local possui locais filhos. Remova ou reatribua os filhos primeiro.`, 'error', 'Erro');
            return;
        }
    }
    
    // Verificar se está em uso
    const fieldMap = {
        locais: 'LOCAL',
        funcoes: 'FUNÇÃO',
        classes: 'CLASSE',
        postos: 'POST/GRAD'
    };
    
    const field = fieldMap[type];
    const inUse = flatData.some(p => p[field] === value);
    
    if (inUse) {
        showToast(`Não é possível excluir. Este ${label.toLowerCase()} está em uso por militares cadastrados.`, 'error', 'Erro');
        return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir "${value}"?`)) {
        return;
    }
    
    // Tratamento especial para funções
    if (type === 'funcoes') {
        const index = configurations[type].findIndex(f => 
            (typeof f === 'string' ? f : f.nome) === value
        );
        if (index !== -1) {
            configurations[type].splice(index, 1);
            // Atualizar ordens
            configurations[type].forEach((funcao, idx) => {
                if (typeof funcao === 'object') {
                    funcao.ordem = idx + 1;
                }
            });
            saveConfigurations();
            renderConfigurations();
            updateFormDropdowns();
            updateAllViews();
            showToast(`${label} excluído com sucesso!`, 'success', 'Sucesso');
        }
    } else if (type === 'locais') {
        // Tratamento especial para locais
        const index = configurations[type].findIndex(l => 
            (typeof l === 'string' ? l : l.nome) === value
        );
        if (index !== -1) {
            configurations[type].splice(index, 1);
            saveConfigurations();
            renderConfigurations();
            updateFormDropdowns();
            updateAllViews();
            showToast(`${label} excluído com sucesso!`, 'success', 'Sucesso');
        }
    } else {
        const index = configurations[type].indexOf(value);
        if (index !== -1) {
            configurations[type].splice(index, 1);
            saveConfigurations();
            renderConfigurations();
            updateFormDropdowns();
            showToast(`${label} excluído com sucesso!`, 'success', 'Sucesso');
        }
    }
}

// Atualizar militares quando uma configuração é editada
function updateMilitaresWithConfig(type, oldValue, newValue) {
    const fieldMap = {
        local: 'LOCAL',
        funcao: 'FUNÇÃO',
        classe: 'CLASSE',
        posto: 'POST/GRAD'
    };
    
    const field = fieldMap[type];
    
    // Atualizar em flatData
    flatData.forEach(pessoa => {
        if (pessoa[field] === oldValue) {
            pessoa[field] = newValue;
        }
    });
    
    // Reconstruir data hierárquico
    rebuildHierarchicalData();
    
    // Salvar alterações
    saveDataToLocalStorage();
    
    // Atualizar todas as visualizações
    updateAllViews();
}

// Reconstruir estrutura hierárquica após mudanças
function rebuildHierarchicalData() {
    data = {};
    flatData.forEach(pessoa => {
        const local = pessoa.LOCAL || 'SEM LOCAL';
        const classe = pessoa.CLASSE || 'SEM CLASSE';
        
        if (!data[local]) data[local] = {};
        if (!data[local][classe]) data[local][classe] = [];
        
        data[local][classe].push(pessoa);
    });
}

// Atualizar todas as visualizações após alterações
function updateAllViews() {
    // Atualizar dashboard
    initDashboard();
    
    // Atualizar tabela
    applyFilters();
    
    // Atualizar organograma
    initOrganograma();
    
    // Atualizar análise DDQOD
    const analysisTab = document.getElementById('analise');
    if (analysisTab && analysisTab.classList.contains('active')) {
        renderAnalise();
    }
}

// Atualizar dropdowns do formulário
function updateFormDropdowns() {
    // Atualizar dropdown de Posto/Graduação
    const postoSelect = document.getElementById('inputPostoGrad');
    if (postoSelect) {
        const currentValue = postoSelect.value;
        postoSelect.innerHTML = '<option value="">Selecione</option>' +
            configurations.postos.map(p => `<option value="${p}">${p}</option>`).join('');
        if (currentValue && configurations.postos.includes(currentValue)) {
            postoSelect.value = currentValue;
        }
    }
    
    // Atualizar dropdown de Local
    const localSelect = document.getElementById('inputLocal');
    if (localSelect) {
        const currentValue = localSelect.value;
        const locaisNomes = getLocaisNomes();
        localSelect.innerHTML = '<option value="">Selecione</option>' +
            locaisNomes.map(l => `<option value="${l}">${l}</option>`).join('');
        if (currentValue && locaisNomes.includes(currentValue)) {
            localSelect.value = currentValue;
        }
    }
    
    // Atualizar dropdown de Função
    const funcaoSelect = document.getElementById('inputFuncao');
    if (funcaoSelect) {
        const currentValue = funcaoSelect.value;
        const funcoesNomes = getFuncoesNomes();
        funcaoSelect.innerHTML = '<option value="">Selecione</option>' +
            funcoesNomes.map(f => `<option value="${f}">${f}</option>`).join('');
        if (currentValue && funcoesNomes.includes(currentValue)) {
            funcaoSelect.value = currentValue;
        }
    }
    
    // Atualizar dropdown de Classe
    const classeSelect = document.getElementById('inputClasse');
    if (classeSelect) {
        const currentValue = classeSelect.value;
        classeSelect.innerHTML = '<option value="">Selecione</option>' +
            configurations.classes.map(c => `<option value="${c}">${c}</option>`).join('');
        if (currentValue && configurations.classes.includes(currentValue)) {
            classeSelect.value = currentValue;
        }
    }
    
    // Recriar filtros multi-select da tabela
    populateFilters();
}

// Mover função para cima ou para baixo na ordem
function moveFuncao(index, direction) {
    if (direction === 'up' && index > 0) {
        // Trocar com o item anterior
        [configurations.funcoes[index], configurations.funcoes[index - 1]] = 
        [configurations.funcoes[index - 1], configurations.funcoes[index]];
    } else if (direction === 'down' && index < configurations.funcoes.length - 1) {
        // Trocar com o próximo item
        [configurations.funcoes[index], configurations.funcoes[index + 1]] = 
        [configurations.funcoes[index + 1], configurations.funcoes[index]];
    }
    
    // Atualizar ordens
    configurations.funcoes.forEach((funcao, idx) => {
        if (typeof funcao === 'object') {
            funcao.ordem = idx + 1;
        }
    });
    
    saveConfigurations();
    renderConfigurations();
    updateAllViews();
    showToast('Ordem atualizada!', 'success');
}

// ============================================
// FUNÇÕES GLOBAIS (para onclick)
// ============================================
window.changePage = changePage;
window.closeOrgDetails = closeOrgDetails;
window.editMilitar = editMilitar;
window.deleteMilitar = deleteMilitar;
window.openConfigModal = openConfigModal;
window.closeConfigModal = closeConfigModal;
window.saveConfig = saveConfig;
window.editConfig = editConfig;
window.deleteConfig = deleteConfig;
window.moveFuncao = moveFuncao;

// ============================================
// GERENCIAMENTO DE AMBIENTES
// ============================================

let ambienteAtual = 'PRODUCAO'; // PRODUCAO ou LABORATORIO

function abrirModalAmbiente() {
    const modal = document.getElementById('modalAmbiente');
    modal.classList.add('active');
}

function fecharModalAmbiente() {
    const modal = document.getElementById('modalAmbiente');
    modal.classList.remove('active');
}

function selecionarAmbiente(ambiente) {
    if (ambiente === ambienteAtual) {
        fecharModalAmbiente();
        showToast(`Você já está no ambiente de ${ambiente === 'PRODUCAO' ? 'PRODUÇÃO' : 'LABORATÓRIO'}`, 'info');
        return;
    }

    if (ambiente === 'LABORATORIO') {
        showToast('Ambiente de Laboratório ainda não implementado', 'warning', 'Em Desenvolvimento');
        return;
    }

    ambienteAtual = ambiente;
    atualizarInterfaceAmbiente();
    fecharModalAmbiente();
    showToast(`Ambiente alterado para ${ambiente === 'PRODUCAO' ? 'PRODUÇÃO' : 'LABORATÓRIO'}`, 'success');
}

function atualizarInterfaceAmbiente() {
    // Atualizar texto do botão
    const btnTexto = document.getElementById('ambienteAtual');
    if (btnTexto) {
        btnTexto.textContent = ambienteAtual === 'PRODUCAO' ? 'PRODUÇÃO' : 'LABORATÓRIO';
    }

    // Atualizar badges no modal
    const badgeProducao = document.getElementById('badgeProducao');
    const badgeLaboratorio = document.getElementById('badgeLaboratorio');
    
    if (ambienteAtual === 'PRODUCAO') {
        badgeProducao.style.display = 'inline';
        badgeLaboratorio.style.display = 'none';
    } else {
        badgeProducao.style.display = 'none';
        badgeLaboratorio.style.display = 'inline';
    }
}

// Expor funções globalmente
window.abrirModalAmbiente = abrirModalAmbiente;
window.fecharModalAmbiente = fecharModalAmbiente;
window.selecionarAmbiente = selecionarAmbiente;
