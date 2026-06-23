# Arquitetura do Sistema e Engenharia de Prompts

Este documento detalha o desenho técnico do **Assistente de Documentação Funcional com IA**, desenvolvido nativamente no **Google AI Studio**. O sistema atua como uma esteira de análise estática de documentos de processo (PDDs) para acelerar o entendimento de times de engenharia.

---

##  Visão Geral do Funcionamento (Zero API / No-Code Engine)

A arquitetura do projeto foi desenhada para ser **totalmente contida (nativa)** dentro do ecossistema do Google AI Studio, eliminando custos de infraestrutura e latências de APIs externas. 

O fluxo de processamento de ponta a ponta segue as seguintes etapas:

1. **Ingestão Multiformato:** O usuário realiza o upload direto de documentos brutos nos formatos `.pdf`, `.docx` ou `.txt` (como arquivos de entrada no prompt).
2. **Camada de Contexto & Instruções de Sistema:** O Google AI Studio processa os documentos utilizando a janela de contexto expandida do modelo, aplicando um conjunto de prompts estruturados de System Role.
3. **Execução Single-Turn (Sem perguntas):** Diferente de um chatbot tradicional, o modelo opera em modo de execução única. Ele recebe a entrada e gera diretamente um relatório consolidado e padronizado.
4. **Output Estruturado:** A saída é renderizada em blocos de texto no formato Markdown, organizando os dados em tópicos de negócio e engenharia.

---

##  Engenharia de Prompts Aplicada

Para transformar manuais operacionais longos em diagnósticos de alto nível para QA, Desenvolvedores e Arquitetos, o assistente utiliza quatro técnicas fundamentais de engenharia de prompts:

* **Role-Play Pattern (Definição de Persona):** O modelo é condicionado a agir estritamente como um *Agente Especialista na Análise de Process Design Documents (PDD) no contexto de Transição para Automação (T2A)*. Isso altera o foco da IA de "repetir o texto" para "avaliar a viabilidade técnica".
* **Negative Prompting (Restrições Estritas):** Para evitar saídas poluídas ou prolixas, foram aplicadas restrições explícitas: *"Não descreva passo a passo operacional"*, *"Não invente informações"* e *"Evite foco excessive em detalhes operacionais"*.
* **Ancoragem Epistêmica (Fatos Baseados no Texto):** Instrução direta de Grounding: *"Se houver falta de informação, sinalize explicitamente"*. Isso força o modelo a mapear lacunas lógicas e contradições em vez de tentar adivinhar as regras ausentes.
* **Structural Formatting Shaper:** O prompt delimita rigidamente as seções obrigatórias de saída (`Resumo do Processo`, `Etapas Principais`, `Regras Críticas e Exceções`, `Pontos de Atenção`, `Escopo` e `Possíveis Gaps`), garantindo padronização visual.

---

##  Desafios Técnicos de Engenharia de Prompts Superados

Durante os testes refinando os prompts no Google AI Studio, três comportamentos precisaram ser mitigados através de refinamento de instruções:

### 1. Tendência ao Resumo Superficial vs. Necessidade de Profundidade Técnico
* **Desafio:** Modelos de linguagem tendem a resumir processos de forma muito genérica (ex: "O robô entra no sistema e altera o peso"). Para times de desenvolvimento, isso é inútil.
* **Solução:** O prompt foi calibrado para exigir a identificação de causas raízes e impactos técnicos detalhados (como *Condições de Corrida*, *Instabilidade de Sincronismo no SAP GUI Scripting*, *Sessões Travadas / SM12* e *Impactos Logísticos*), elevando o nível analítico da IA.

### 2. O Desafio da Redundância Operacional
* **Desafio:** O modelo frequentemente caía na armadilha de reescrever o passo a passo de cliques do usuário que já constava no PDD original.
* **Solução:** Inclusão de uma diretriz de filtragem de escopo: *"Seu objetivo é reduzir o tempo de entendimento do processo e evitar que reuniões sejam usadas para leitura de documentação"*. Isso virou a chave do modelo para focar em regras de negócio e exceções não óbvias.

### 3. Detecção de Inconsistências Cruzadas
* **Desafio:** Garantir que o modelo não apenas lesse o documento de forma isolada, mas comparasse partes dele para achar erros cometidos pelo autor do PDD.
* **Solução:** Criação de uma seção dedicada a testes de consistência: *"Identifique possíveis contradições entre regras e fluxo; verifique se as etapas fazem sentido; aponte quando uma regra não está refletida no fluxo descrito"*.
