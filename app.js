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
});

// ============================================
// CARREGAMENTO DE DADOS
// ============================================
async function loadData() {
    try {
        const response = await fetch('base_organizacao.json');
        data = await response.json();
        
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
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do arquivo JSON');
    }
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
    const totalEfetivo = flatData.length;
    const oficiais = flatData.filter(p => p.CLASSE === 'OF').length;
    const pracas = flatData.filter(p => p.CLASSE !== 'OF').length;
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
    
    // Contar por classe
    const classeCount = {};
    flatData.forEach(p => {
        classeCount[p.CLASSE] = (classeCount[p.CLASSE] || 0) + 1;
    });
    
    const colors = {
        'OF': '#ed8936',
        'SGT': '#1a365d',
        'QPE': '#805ad5',
        'QOE': '#d53f8c',
        'CB/SD': '#38a169'
    };
    
    new Chart(ctx, {
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
    
    // Contar por unidade
    const unidadeCount = {};
    flatData.forEach(p => {
        unidadeCount[p.LOCAL] = (unidadeCount[p.LOCAL] || 0) + 1;
    });
    
    // Ordenar por quantidade
    const sorted = Object.entries(unidadeCount).sort((a, b) => b[1] - a[1]);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                label: 'Efetivo',
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
                            return `Efetivo: ${context.parsed.y}`;
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
    const funcaoCount = {};
    flatData.forEach(p => {
        funcaoCount[p.FUNÇÃO] = (funcaoCount[p.FUNÇÃO] || 0) + 1;
    });
    
    const total = flatData.length;
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
    const postoCount = {};
    flatData.forEach(p => {
        postoCount[p['POST/GRAD']] = (postoCount[p['POST/GRAD']] || 0) + 1;
    });
    
    const total = flatData.length;
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
        const total = Object.keys(unidadeData).reduce((sum, classe) => {
            return sum + unidadeData[classe].length;
        }, 0);
        
        const classeStats = Object.keys(unidadeData).map(classe => {
            return `
                <div class="unit-stat">
                    <span class="unit-stat-label">${classe}</span>
                    <span class="unit-stat-value">${unidadeData[classe].length}</span>
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
    
    tbody.innerHTML = pageData.map(pessoa => `
        <tr>
            <td>${pessoa.NUMERO}</td>
            <td><strong>${pessoa['POST/GRAD']}</strong></td>
            <td>${pessoa.NOME}</td>
            <td>${pessoa.LOCAL}</td>
            <td><span class="badge badge-${pessoa.FUNÇÃO.toLowerCase()}">${pessoa.FUNÇÃO}</span></td>
            <td><span class="badge badge-${pessoa.CLASSE.toLowerCase().replace('/', '')}">${pessoa.CLASSE}</span></td>
        </tr>
    `).join('');
    
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
    html += `<div class="org-details" data-details="${node.name}">`;
    html += renderOrgDetails(node.name);
    html += '</div>';
    
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
    
    // Fechar todos os detalhes
    document.querySelectorAll('.org-details').forEach(d => d.classList.remove('show'));
    document.querySelectorAll('.org-box').forEach(b => b.classList.remove('expanded'));
    
    // Abrir se não estava visível
    if (!isVisible) {
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

// ============================================
// FUNÇÕES GLOBAIS (para onclick)
// ============================================
window.changePage = changePage;
window.closeOrgDetails = closeOrgDetails;
