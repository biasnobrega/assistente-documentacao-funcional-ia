/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { PDDAnalysis, UserProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzePDD(content: string, profile: UserProfile): Promise<PDDAnalysis> {
  const isQA = profile === 'QA';
  const currentDate = new Date().toLocaleDateString('pt-BR');
  
  const qaInstructions = isQA 
    ? `SEÇÃO EXTRA (OBRIGATÓRIO PARA QA): Preencha o objeto "validacaoQA" detalhando:
       - sugestoesValidacao: Como validar os pontos de atenção identificados.
       - complementosPDD: Indique possíveis complementações no PDD.
       - atuacaoQA: Destaque onde o QA pode atuar para reduzir gaps.
       - perguntasT2A: Sugira perguntas ou verificações adicionais para a reunião T2A.`
    : `NÃO PREENCHA a seção "validacaoQA".`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        text: `Você é um arquiteto sênior de T2A (Task to Automation). Sua missão é transformar este PDD em um material de preparação estratégica para uma reunião técnica (Pre-Refinement).
        
        OBJETIVO:
        Garantir um entendimento profundo, técnico e estratégico do processo. Prepare o usuário para uma reunião de validação e discussão técnica de alta complexidade (Pre-Refinement). O briefing deve ser EXAUSTIVO nos pontos que geram impacto na automação e em decisões arquiteturais.

        PERFIL DO USUÁRIO: ${profile}. 

        CONSISTÊNCIA: A análise base (Resumo, Etapas, Regras, Pontos de Atenção, Escopo e Gaps) deve ser ÚNICA, CONSISTENTE e DETALHADA para qualquer perfil. Não economize em detalhes técnicos.

        ${qaInstructions}

        DIRETRIZES DE ESTILO E COMUNICAÇÃO (CRÍTICO):
        1. FOCO EM VALIDAÇÃO E PROFUNDIDADE: Forneça insights profundos que ajudem o usuário a questionar ou confirmar o processo com stakeholders.
        2. ANÁLISE TÉCNICA EXAUSTIVA: Use frases assertivas e tecnicamente ricas. Evite superficialidade. Se um ponto é importante, desenvolva-o.
        3. PRIORIZAÇÃO E DETALHAMENTO: Destaque o que pode "travar" o projeto, mas forneça o contexto completo do porquê e como isso impacta o desenvolvimento.
        4. FILTRO DE VALOR QUALITATIVO: Remova o óbvio, mas densifique o que é crítico para o perfil ${profile}.

        DIRETRIZES DE ANÁLISE:
        1. IDENTIFIQUE CONTRADIÇÕES E NUANCES: Exponha quando o PDD diz uma coisa mas o fluxo sugere outra, detalhando as implicações disso.
        2. REGRAS IMPLÍCITAS E REQUISITOS TÉCNICOS: Aponte comportamentos do sistema que o documento não cita, mas que são mandatórios para uma automação robusta.
        3. GAPS DE DEFINIÇÃO E IMPACTO: Sinalize explicitamente campos, caminhos ou acessos não explicados, avaliando o risco técnico de cada lacuna.
        4. DESENVOLVA PONTOS DE ATENÇÃO (CRÍTICO): Esta seção deve ser o coração da análise técnica. Cada ponto de atenção deve ser obrigatoriamente dividido em três campos específicos no JSON (risco, causa, impacto).
           - RISCO: Esta deve ser a seção mais detalhada. Descreva de forma HIPER-EXAUSTIVA e PROLIXA a natureza técnica do risco. Use MUITAS palavras para explorar todas as variáveis sistêmicas, condições de corrida, cenários de exceção, vulnerabilidades de interface e por que cada minúcia constitui uma ameaça severa à estabilidade. (Texto extremamente longo e profundo).
           - CAUSA: Esta seção também deve ser HIPER-DETALHADA. Explique de forma EXAUSTIVA a origem técnica ou funcional raiz do problema. Use MUITAS palavras para correlacionar limitações de sistema, ambiguidades específicas no PDD (citando evidências), latências de rede, comportamentos de APIs ou legados manuais. O "porquê" deve ser explorado em nível enciclopédico. (Texto extremamente longo e denso).
           - IMPACTO: Desenvolva extensamente as consequências imediatas e secundárias para a automação e para o negócio.

           NÃO economize palavras, especialmente no RISCO. Use um tom técnico, denso e enciclopédico. Seja específico quanto aos seletores, latências e fluxos citados no PDD.

           Evite termos genéricos. Seja específico quanto aos seletores, logs, latências, volumetrias e fluxos técnicos citados ou implícitos no PDD.

        BLOCO DE PERSISTÊNCIA (OBRIGATÓRIO AO FINAL):
        Gere um objeto "persistenceBlock" para armazenamento de dados com:
        - usuario: "sessao autenticada"
        - perfil: "${profile}"
        - data: "${currentDate}"
        - processo: Nome do processo ou "nao identificado"
        - resumo: Até 3 linhas com o objetivo do processo
        - regrasCriticas: Principais regras que impactam o comportamento
        - pontosAtencao: Acessos, testes e validações relevantes
        - gaps: Principais lacunas ou riscos identificados

        ESTRUTURA DO JSON:
        - "resumoProcesso": Visão geral simples do que o processo faz.
        - "etapasPrincipais": Fluxo em nível macro (marcos fundamentais).
        - "regrasExcecoes": Regras críticas e comportamentos não óbvios.
        - "pontosAtencao": Acessos, massa de dados, e validações técnicas.
        - "escopo": Delimitação clara do que será e do que NÃO será automatizado.
        - "gaps": Lacunas de informação ou riscos de definição mal definida.
        - "persistenceBlock": O bloco padronizado de armazenamento descrito acima.

        Documento:
        ${content}
        `,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          resumoProcesso: { type: Type.STRING },
          etapasPrincipais: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          regrasExcecoes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                descricao: { type: Type.STRING },
                contexto: { type: Type.STRING }
              }
            }
          },
          pontosAtencao: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                risco: { type: Type.STRING },
                causa: { type: Type.STRING },
                impacto: { type: Type.STRING }
              },
              required: ["risco", "causa", "impacto"]
            }
          },
          escopo: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                categoria: { type: Type.STRING },
                descricao: { type: Type.STRING }
              }
            }
          },
          gaps: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          validacaoQA: {
            type: Type.OBJECT,
            properties: {
              sugestoesValidacao: { type: Type.ARRAY, items: { type: Type.STRING } },
              complementosPDD: { type: Type.ARRAY, items: { type: Type.STRING } },
              atuacaoQA: { type: Type.ARRAY, items: { type: Type.STRING } },
              perguntasT2A: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          persistenceBlock: {
            type: Type.OBJECT,
            properties: {
              usuario: { type: Type.STRING },
              perfil: { type: Type.STRING },
              data: { type: Type.STRING },
              processo: { type: Type.STRING },
              resumo: { type: Type.STRING },
              regrasCriticas: { type: Type.STRING },
              pontosAtencao: { type: Type.STRING },
              gaps: { type: Type.STRING }
            },
            required: ["usuario", "perfil", "data", "processo", "resumo", "regrasCriticas", "pontosAtencao", "gaps"]
          }
        },
        required: ["title", "resumoProcesso", "etapasPrincipais", "regrasExcecoes", "pontosAtencao", "escopo", "gaps", "persistenceBlock"]
      },
    },
  });

  if (!response.text) {
    throw new Error("Falha ao analisar o documento.");
  }

  return JSON.parse(response.text) as PDDAnalysis;
}
