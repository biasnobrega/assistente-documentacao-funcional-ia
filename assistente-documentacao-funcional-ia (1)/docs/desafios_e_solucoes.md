# Desafios Técnicos e Soluções Aplicadas

Este documento mapeia os principais comportamentos anômalos identificados durante os ciclos de testes com modelos de linguagem no **Google AI Studio** e as estratégias de contorno via refinamento de instruções.

---

## 1. O Desafio da Redundância Operacional vs. Foco em Alto Nível
* **Desafio:** Inicialmente, ao ler documentos de processos longos, o modelo tendia a reescrever o passo a passo operacional de cliques e preenchimentos de campos que o usuário original já havia documentado. Para reuniões de engenharia e QA, essa redundância tornava a leitura cansativa e ineficiente.
* **Solução (Estratégia de Filtragem de Escopo):** Inclusão de diretrizes explícitas de restrição e modelagem de comportamento no prompt principal: *"Evite foco excessivo em detalhes operacionais"*, *"Não descreva passo a passo operacional"* e *"Seu objetivo é reduzir o tempo de entendimento do processo e evitar que reuniões sejam usadas para leitura de documentação"*. Isso redirecionou o foco da IA para regras de negócio e lacunas lógicas.

## 2. Detecção de Inconsistências Cruzadas entre Regras e Fluxo
* **Desafio:** Garantir que o modelo não apenas fizesse uma leitura linear e passiva do texto, mas sim comparasse diferentes seções para encontrar erros, ambiguidades ou contradições deixadas pelo autor do documento original.
* **Solução (Camada Contraditória Act-As-Lint):** Criação de uma seção dedicada a testes de consistência cruzada no prompt: *"Identifique possíveis contradições entre regras e fluxo; verifique se as etapas fazem sentido; aponte quando uma regra não está refletida no fluxo descrito"*. Os resultados dessa varredura estrutural são concentrados diretamente no módulo de "Possíveis Gaps".

## 3. Grounding Estrito e Mitigação de Alucinações por Ausência de Dados
* **Desafio:** Quando o documento analisado omitia informações críticas para o desenvolvimento (como regras de exceção ou acessos necessários), os modelos de linguagem podiam tentar inferir ou deduzir as respostas por conta própria, gerando falsos positivos na análise técnica.
* **Solução (Ancoragem Epistêmica Negativa):** Calibração do prompt de sistema exigindo que o modelo assuma o desconhecimento de forma transparente: *"Não invente informações"* e *"Se houver falta de informação, sinalize explicitamente"*. Caso uma etapa dependa de um fator não explicado, o assistente obrigatoriamente aponta a lacuna.
