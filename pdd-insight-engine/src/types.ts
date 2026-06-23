/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserProfile = 'DEV' | 'QA';

export interface PDDAnalysis {
  title: string;
  resumoProcesso: string;
  etapasPrincipais: string[];
  regrasExcecoes: {
    descricao: string;
    contexto: string;
  }[];
  pontosAtencao: {
    risco: string;
    causa: string;
    impacto: string;
  }[];
  escopo: {
    categoria: string;
    descricao: string;
  }[];
  gaps: string[];
  validacaoQA?: {
    sugestoesValidacao: string[];
    complementosPDD: string[];
    atuacaoQA: string[];
    perguntasT2A: string[];
  };
  persistenceBlock: {
    usuario: string;
    perfil: string;
    data: string;
    processo: string;
    resumo: string;
    regrasCriticas: string;
    pontosAtencao: string;
    gaps: string;
  };
}

export type ViewMode = 'resumo' | 'etapas' | 'regras' | 'atencao' | 'escopo' | 'gaps' | 'qa' | 'persist';
