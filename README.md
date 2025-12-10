# Sistema de Gestão de Efetivo - DDQOD

Sistema completo de gestão de efetivo com Dashboard, Tabela de dados, Organograma e Análise DDQOD.

## 🚀 Como Executar

Basta abrir o arquivo `index.html` diretamente no navegador!

Não precisa de servidor ou instalações adicionais.

## 📁 Estrutura de Arquivos

- `index.html` - Interface principal
- `styles.css` - Estilos da aplicação
- `app.js` - Lógica JavaScript
- `base_organizacao.json` - Dados iniciais do efetivo
- `bombeiro.png` - Logo do sistema
- `README.md` - Este arquivo

## 💾 Persistência de Dados

**Os dados são salvos automaticamente no navegador (LocalStorage):**

1. Na primeira vez, carrega os dados do arquivo `base_organizacao.json`
2. Todas as edições, adições e exclusões são salvas automaticamente no navegador
3. Os dados persistem mesmo após fechar e reabrir a página

**Botões de Gerenciamento:**
- **Exportar Dados**: Baixa um arquivo JSON com todas as suas alterações
- **Resetar Dados**: Restaura os dados originais do arquivo `base_organizacao.json`

## 🔧 Funcionalidades

- ✅ Dashboard com estatísticas e gráficos
- ✅ Tabela com filtros e ordenação
- ✅ Organograma hierárquico interativo
- ✅ Análise DDQOD (Previsto vs Existente)
- ✅ CRUD completo (Adicionar, Editar, Excluir militares)
- ✅ Persistência automática de dados no navegador
- ✅ Exportar/Importar dados em JSON
- ✅ Contagem única de militares (evita duplicatas)

## ⚠️ Observações

- Os dados ficam salvos no navegador (localStorage)
- Para compartilhar dados entre computadores, use o botão "Exportar Dados" e substitua o arquivo `base_organizacao.json`
- Para fazer backup, use regularmente o botão "Exportar Dados"

