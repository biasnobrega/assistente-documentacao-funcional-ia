#  Assistente de Documentação Funcional com IA

Este projeto apresenta um **Assistente de Análise Estática de Processos** desenvolvido nativamente no **Google AI Studio**. A solução foi projetada para atuar como um engenheiro de software e analista de processos sênior no contexto de Transição para Automação (T2A), transformando documentos operacionais longos (PDDs) em diagnósticos técnicos estruturados de alto nível.

O principal objetivo da ferramenta é mitigar o tempo gasto por times de desenvolvimento, arquitetura e QA na leitura passiva de documentações, preparando-os diretamente para discussões técnicas focadas em soluções.

---

##  Escopo e Funcionalidades

* **Análise Multiformato Single-Turn:** Ingestão direta de arquivos `.pdf`, `.docx` ou `.txt` sem a necessidade de fragmentação de dados (No-Chunking), aproveitando a janela de contexto expandida da IA.
* **Mapeamento Macro de Processos:** Extração de visões gerais e fluxos em nível macro sem redundâncias operacionais ou passo a passo de cliques.
* **Detecção de Gaps e Inconsistências:** Varredura ativa no texto para identificar contradições, fluxos omitidos e regras de negócios ambíguas.
* **Diagnóstico de Riscos e Impactos:** Identificação de causas raízes técnicas (como condições de corrida, latências de rede ou dependências de interface visual) e seus respectivos impactos para a automação.
* **Modelagem de Persistência:** Estruturação automatizada de payloads e tabelas relacionais para armazenamento do histórico de análises e auditoria por usuário.

---

##  Estrutura do Repositório

O projeto está organizado da seguinte forma para facilitar a avaliação técnica:

* **[`docs/arquitetura.md`](docs/arquitetura.md):** Detalhamento do fluxo de dados da esteira de processamento e técnicas de Engenharia de Prompts utilizadas.
* **[`docs/conceitos.md`](docs/conceitos.md):** Embasamento teórico sobre Janela de Contexto Expandida, Engenharia de Prompts e Engenharia de Requisitos aplicada à automação.
* **[`docs/desafios_e_solucoes.md`](docs/desafios_e_solucoes.md):** Mapeamento de desafios comportamentais dos modelos de linguagem (como redundância e alucinações) e como foram mitigados via instruções de restrição.
* **[`prompts/`](prompts/):** Contém os prompts de sistema reais utilizados para a estruturação de saídas, análise crítica e persistência em banco de dados.

---

##  Tecnologias e Ferramentas Utilizadas

* **Google AI Studio / IDX Workspace:** Ambiente de desenvolvimento do prompt e geração da estrutura do aplicativo (Firebase Applet).
* **React & TypeScript:** Base do desenvolvimento do front-end da aplicação (`src/App.tsx`).
* **Vite:** Build tool utilizada para garantir a performance e inicialização rápida do ambiente de desenvolvimento.
* **Markdown:** Padronização estrutural dos relatórios técnicos gerados.
