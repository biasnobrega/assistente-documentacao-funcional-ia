# Conceitos Envolvidos 

Este documento apresenta os conceitos de Inteligência Artificial e Engenharia de Requisitos que fundamentam o desenvolvimento do **Assistente de Documentação Funcional**.

---

## 1. Engenharia de Prompts Avançada (Prompt Engineering)
A solução baseia-se no princípio de que modelos de linguagem de larga escala (LLMs) respondem de forma drasticamente diferente dependendo do direcionamento contextual. O projeto explora:

* **System Instructions (Instruções de Sistema):** Definição persistente de comportamento que dita as fronteiras éticas e analíticas da IA ao longo de toda a sessão de análise.
* **Filosofia Single-Turn:** Otimização do prompt para extração máxima de valor em uma única iteração de inferência, simulando o comportamento de um compilador de código ou analisador estático.

## 2. Janela de Contexto Expandida (Long-Context Window)
Diferente de abordagens antigas que exigiam fragmentar arquivos (Chunking) e utilizar bancos de dados vetoriais (RAG) para ler documentos extensos, o projeto utiliza a capacidade nativa de **Janela de Contexto Expandida** do Google AI Studio. Isso permite:

* Ingestão completa de arquivos de texto complexos (`.pdf`, `.docx`, `.txt`) preservando a correlação semântica global entre o início e o fim do documento.
* Análise cruzada de regras distribuídas em diferentes páginas sem perda de memória volátil.

## 3. Transição para Automação (T2A) e Análise Estática de Requisitos
No ciclo de vida de desenvolvimento de software e automações (RPA/IA), o PDD (*Process Design Document*) é a especificação técnica do sistema. O projeto resolve um gargalo clássico da Engenharia de Requisitos utilizando IA para:

* **Mapeamento de Exceções Técnico-Operacionais:** Identificação prévia de cenários onde a automação falharia (como janelas modais inesperadas, latência de rede em ERPs como o SAP, e concorrência de acessos).
* **Identificação de Gaps:** Atuar como uma ferramenta de *Linting* para regras de negócio, encontrando fluxos descritos no texto que não possuem uma contraparte de tratamento lógico no processo.
