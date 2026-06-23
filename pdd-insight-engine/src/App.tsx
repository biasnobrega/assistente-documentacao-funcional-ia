/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Search, 
  Layers, 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Upload,
  ChevronRight,
  Loader2,
  X,
  MessageSquareQuote,
  FileUp,
  FileType,
  User,
  Save,
  Database,
  History,
  LogOut,
  Calendar,
  Clock
} from 'lucide-react';
import { PDDAnalysis, ViewMode, UserProfile } from './types';
import { analyzePDD } from './services/geminiService';
import { extractTextFromFile } from './lib/fileParser';
import { auth, loginWithGoogle, logout, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp, serverTimestamp, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PDDAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [activeView, setActiveView] = useState<ViewMode>('resumo');
  const [profile, setProfile] = useState<UserProfile>('DEV');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setFileName(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setParsing(true);
    setFileName(file.name);
    try {
      const text = await extractTextFromFile(file);
      setContent(text);
    } catch (error) {
      console.error(error);
      alert('Erro ao ler o arquivo. Certifique-se que é um PDF, DOCX ou TXT válido.');
      setFileName(null);
    } finally {
      setParsing(false);
    }
  };

  const startAnalysis = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const result = await analyzePDD(content, profile);
      setAnalysis(result);
      setActiveView('resumo');
      
      // Save to history if logged in
      if (auth.currentUser) {
        saveToHistory(result);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao analisar. Tente um documento menor ou mais estruturado.');
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = async (result: PDDAnalysis) => {
    if (!auth.currentUser) {
      console.warn('saveToHistory: Not logged in, skipping save');
      return;
    }
    
    setSaveLoading(true);
    setSaveSuccess(false);
    const path = 'analises';
    try {
      console.log('--- STARTING SAVE ---');
      const dataToSave = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        perfil: profile,
        dataHora: serverTimestamp(),
        ...result
      };
      
      const docRef = await addDoc(collection(db, path), dataToSave);
      console.log('Saved successfully with ID:', docRef.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save failed:', e);
      handleFirestoreError(e, OperationType.CREATE, path);
    } finally {
      setSaveLoading(false);
    }
  };

  const fetchHistory = async (user = auth.currentUser) => {
    if (!user) {
      console.log('fetchHistory: No user');
      return;
    }
    setLoadingHistory(true);
    setHistoryError(null);
    const path = 'analises';
    try {
      console.log('Fetching history for user:', user.uid);
      const q = query(
        collection(db, path),
        where('userId', '==', user.uid),
        orderBy('dataHora', 'desc')
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('History fetched:', docs.length, 'records');
      setHistory(docs);
    } catch (e: any) {
      console.error('Error fetching history:', e);
      const msg = e.message || String(e);
      setHistoryError(msg);
      
      if (msg.includes('index') || msg.includes('failed-precondition')) {
        try {
          console.log('Retrying with simple query (no orderBy)...');
          const qSimple = query(
            collection(db, path),
            where('userId', '==', user.uid)
          );
          const snapshot = await getDocs(qSimple);
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          docs.sort((a: any, b: any) => {
            const dateA = a.dataHora?.seconds || 0;
            const dateB = b.dataHora?.seconds || 0;
            return dateB - dateA;
          });
          setHistory(docs);
          setHistoryError('Nota: Ordenação via software. (Index Firestore ausente)');
        } catch (e2) {
          handleFirestoreError(e2, OperationType.LIST, path);
        }
      } else {
        // Don't throw here, just set error state for UI
        setHistoryError('Permissão negada ou erro de rede ao acessar o banco.');
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // Limpa listener anterior se existir
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      if (user) {
        console.log('Setting up real-time history for:', user.uid);
        const path = 'analises';
        const q = query(
          collection(db, path),
          where('userId', '==', user.uid),
          orderBy('dataHora', 'desc')
        );

        setLoadingHistory(true);
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('Real-time history update:', docs.length, 'records');
          setHistory(docs);
          setLoadingHistory(false);
          setHistoryError(null);
        }, (error: any) => {
          console.error('Snapshot error:', error);
          const msg = error.message || String(error);
          
          // Se falhar por falta de index, tenta query simples
          if (msg.includes('index') || msg.includes('failed-precondition')) {
            const qSimple = query(collection(db, path), where('userId', '==', user.uid));
              unsubscribeSnapshot = onSnapshot(qSimple, (s2) => {
                const d2 = s2.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort manually handling potential null dataHora (pending writes)
                d2.sort((a: any, b: any) => {
                  const dateA = a.dataHora?.seconds || Number.MAX_SAFE_INTEGER;
                  const dateB = b.dataHora?.seconds || Number.MAX_SAFE_INTEGER;
                  return dateB - dateA;
                });
                setHistory(d2);
                setLoadingHistory(false);
                setHistoryError('Nota: Ordenação via software. (Index Firestore ausente)');
              });
          } else {
            setHistoryError('Erro na conexão em tempo real.');
            setLoadingHistory(false);
          }
        });
      } else {
        setHistory([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const reset = () => {
    setAnalysis(null);
    setContent('');
    setFileName(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-[#333] px-8 py-4 flex items-center justify-between bg-[#1a1a1a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Cpu className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight uppercase">PDD Insight Engine</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">T2A Analysis Agent</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {currentUser && (
            <button 
              onClick={() => {
                const next = !showHistory;
                setShowHistory(next);
                if (next) fetchHistory();
              }}
              className={`flex items-center gap-2 text-xs transition-colors ${showHistory ? 'text-blue-400' : 'text-zinc-400 hover:text-white'}`}
            >
              <History className="w-4 h-4" /> 
              {showHistory ? 'Voltar para Análise' : 'Meu Histórico'}
            </button>
          )}

          {!currentUser ? (
            <button 
              onClick={loginWithGoogle}
              className="flex items-center gap-2 px-4 py-1.5 bg-white text-black text-xs font-semibold rounded-full hover:bg-zinc-200 transition-all active:scale-95"
            >
              <User className="w-3.5 h-3.5" /> Login Google
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-zinc-900 border border-[#333] px-3 py-1 rounded-full">
              {currentUser.photoURL && (
                <img src={currentUser.photoURL} className="w-5 h-5 rounded-full" alt="Avatar" referrerPolicy="no-referrer" />
              )}
              <span className="text-[10px] text-zinc-300 font-medium max-w-[100px] truncate">{currentUser.displayName || currentUser.email}</span>
              <button 
                onClick={logout}
                className="text-zinc-500 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          )}

          {analysis && !showHistory && (
            <div className="flex items-center gap-4 border-l border-[#333] pl-6">
              {saveLoading && (
                <div className="flex items-center gap-2 text-zinc-500 text-[10px] animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Salvando no histórico...
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-1 text-green-500 text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  Salvo!
                </div>
              )}
              <button 
                onClick={reset}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" /> Resetar
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.section
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col p-8 max-w-6xl mx-auto w-full"
            >
              <div className="flex justify-between items-center mb-8">
                <HeaderSection title="Histórico de Análises" subtitle="Seus briefings técnicos registrados (Tempo Real)" />
                <button 
                  onClick={() => fetchHistory()}
                  disabled={loadingHistory}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  <Search className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Check Sync
                </button>
              </div>
              
              {loadingHistory ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : historyError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-red-400 space-y-4">
                  <AlertTriangle className="w-12 h-12 opacity-50" />
                  <p className="max-w-md text-center">{historyError}</p>
                  <button 
                    onClick={fetchHistory}
                    className="px-4 py-2 bg-zinc-800 rounded-lg text-xs hover:bg-zinc-700 transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                  <History className="w-12 h-12 opacity-20" />
                  <p>Você ainda não realizou nenhuma análise salva.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map((item) => (
                    <motion.div 
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 flex flex-col gap-4 group hover:border-blue-500/50 transition-all cursor-pointer"
                      onClick={() => {
                        // Reconstrói a estrutura completa para visualização
                        const itemData = { ...item };
                        
                        // Fallback para registros antigos que podem não ter a estrutura completa
                        const analysisData: PDDAnalysis = {
                          title: itemData.title || itemData.processo || 'Análise sem título',
                          resumoProcesso: itemData.resumoProcesso || itemData.resumo || '',
                          etapasPrincipais: itemData.etapasPrincipais || [],
                          regrasExcecoes: itemData.regrasExcecoes || (itemData.regrasCriticas ? itemData.regrasCriticas.map((r: any) => ({
                            descricao: r.regra || r.descricao,
                            contexto: r.contexto || ''
                          })) : []),
                          pontosAtencao: itemData.pontosAtencao || [],
                          escopo: itemData.escopo || (itemData.gaps && Array.isArray(itemData.gaps) && typeof itemData.gaps[0] === 'object' ? itemData.gaps : []),
                          gaps: Array.isArray(itemData.gaps) && typeof itemData.gaps[0] === 'string' ? itemData.gaps : [],
                          validacaoQA: itemData.validacaoQA,
                          persistenceBlock: itemData.persistenceBlock || {
                            usuario: itemData.userEmail || '',
                            perfil: itemData.perfil || '',
                            data: itemData.dataHora?.toDate()?.toLocaleString() || new Date().toLocaleString(),
                            processo: itemData.processo || itemData.title || '',
                            resumo: itemData.resumo || itemData.resumoProcesso || '',
                            regrasCriticas: '',
                            pontosAtencao: '',
                            gaps: ''
                          }
                        };
                        
                        setAnalysis(analysisData);
                        setShowHistory(false);
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="px-2 py-1 bg-blue-500/10 rounded text-[10px] font-bold text-blue-400 uppercase tracking-widest border border-blue-500/20">
                          {item.perfil}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <Calendar className="w-3 h-3" />
                          {item.dataHora?.toDate().toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-zinc-100 font-semibold group-hover:text-blue-400 transition-colors line-clamp-1">
                          {item.processo || item.title || 'Análise Sem Nome'}
                        </h3>
                        <p className="text-zinc-500 text-xs line-clamp-2 italic">
                          {item.resumo || item.resumoProcesso || 'Sem resumo disponível'}
                        </p>
                      </div>

                      <div className="mt-auto pt-4 border-t border-[#333] flex items-center justify-between text-[10px] uppercase font-mono tracking-widest text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.dataHora?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <button className="text-blue-500 hover:underline">Ver Detalhes</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          ) : !analysis ? (
            <motion.section 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full"
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-light mb-4">Acelere seu <span className="text-blue-500 font-medium">Refinamento Técnico</span></h2>
                <p className="text-zinc-400 max-w-xl mx-auto">
                  Carregue seu PDD (.pdf, .docx, .txt) para extrair os pontos críticos de discussão, riscos e requisitos técnicos em segundos.
                </p>
              </div>

              {/* Profile Selection */}
              <div className="flex gap-4 mb-8">
                <button 
                  onClick={() => setProfile('DEV')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${profile === 'DEV' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-[#1a1a1a] border-[#333] text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Cpu className="w-4 h-4" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Perfil</p>
                    <p className="text-sm font-semibold">Dev / Arquiteto</p>
                  </div>
                </button>
                <button 
                  onClick={() => setProfile('QA')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${profile === 'QA' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-[#1a1a1a] border-[#333] text-zinc-500 hover:text-zinc-300'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Perfil</p>
                    <p className="text-sm font-semibold">Analista de QA</p>
                  </div>
                </button>
              </div>

              <div className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden focus-within:border-blue-500/50 transition-all shadow-2xl">
                {/* File Upload Zone */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    group cursor-pointer border-2 border-dashed m-4 rounded-lg p-8 flex flex-col items-center justify-center transition-all bg-black/10
                    ${fileName ? 'border-green-500/50 bg-green-500/5' : 'border-[#333] hover:border-blue-500/50 hover:bg-blue-500/5'}
                  `}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.docx,.txt" 
                    onChange={handleFileUpload}
                  />
                  {parsing ? (
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                  ) : fileName ? (
                    <FileType className="w-10 h-10 text-green-500 mb-3" />
                  ) : (
                    <FileUp className="w-10 h-10 text-zinc-600 group-hover:text-blue-500 mb-3 transition-colors" />
                  )}
                  <p className="text-sm font-medium text-zinc-300">
                    {parsing ? 'Processando arquivo...' : fileName || 'Clique para carregar o PDD'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 uppercase font-mono tracking-wider">
                    Suporta PDF, DOCX e TXT
                  </p>
                </div>

                <div className="px-6 pb-2 text-[10px] text-zinc-600 uppercase font-mono tracking-widest text-center">
                  --- OU COLE O TEXTO ABAIXO ---
                </div>

                <textarea
                  className="w-full h-40 bg-transparent p-6 text-zinc-300 font-mono text-sm resize-none focus:outline-none scrollbar-hide"
                  placeholder="Cole aqui o texto do documento se preferir..."
                  value={content}
                  onChange={handleTextChange}
                />
                
                <div className="p-4 bg-black/20 border-t border-[#333] flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
                      {content.length > 0 ? `${content.length} caracteres extraídos` : 'Aguardando documento'}
                    </span>
                    {fileName && <span className="text-[10px] text-green-500 font-mono truncate max-w-[150px]">{fileName}</span>}
                  </div>
                  <button
                    disabled={loading || parsing || !content.trim()}
                    onClick={startAnalysis}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerando Insights...
                      </>
                    ) : (
                      <>
                        Gerar Briefing
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="mt-12 grid grid-cols-3 gap-6 w-full text-center">
                <div className="p-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="text-zinc-400 w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1">Regras e Exceções</h3>
                  <p className="text-[11px] text-zinc-500">Comportamentos não óbvios capturados do documento.</p>
                </div>
                <div className="p-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Search className="text-zinc-400 w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1">Gaps Identificados</h3>
                  <p className="text-[11px] text-zinc-500">Sinalização explícita de ausência de informações.</p>
                </div>
                <div className="p-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileText className="text-zinc-400 w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-1">Briefing Executivo</h3>
                  <p className="text-[11px] text-zinc-500">Visão macro sem detalhamento operacional.</p>
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section 
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex overflow-hidden lg:flex-row flex-col"
            >
              {/* Sidebar Tabs */}
              <aside className="lg:w-64 border-r border-[#333] bg-[#1a1a1a] flex lg:flex-col flex-row overflow-x-auto lg:overflow-y-auto">
                <div className="p-6 hidden lg:block">
                  <h2 className="text-zinc-100 font-bold truncate">{analysis.title}</h2>
                  <p className="text-[10px] text-zinc-500 uppercase mt-1">Material de Reunião</p>
                </div>

                <div className="flex lg:flex-col flex-row lg:px-3 p-2 gap-1 lg:flex-1">
                  <NavButton 
                    active={activeView === 'resumo'} 
                    onClick={() => setActiveView('resumo')}
                    icon={<FileText className="w-4 h-4" />}
                    label="Resumo do Processo"
                  />
                  <NavButton 
                    active={activeView === 'etapas'} 
                    onClick={() => setActiveView('etapas')}
                    icon={<Layers className="w-4 h-4" />}
                    label="Etapas Principais"
                  />
                  <NavButton 
                    active={activeView === 'regras'} 
                    onClick={() => setActiveView('regras')}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    label="Regras e Exceções"
                  />
                  <NavButton 
                    active={activeView === 'atencao'} 
                    onClick={() => setActiveView('atencao')}
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="Pontos de Atenção"
                  />
                  <NavButton 
                    active={activeView === 'escopo'} 
                    onClick={() => setActiveView('escopo')}
                    icon={<Settings className="w-4 h-4" />}
                    label="Escopo"
                  />
                  <NavButton 
                    active={activeView === 'gaps'} 
                    onClick={() => setActiveView('gaps')}
                    icon={<Search className="w-4 h-4" />}
                    label="Possíveis Gaps"
                  />
                  {analysis.validacaoQA && (
                    <NavButton 
                      active={activeView === 'qa'} 
                      onClick={() => setActiveView('qa')}
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      label="Validação QA"
                    />
                  )}
                  <NavButton 
                    active={activeView === 'persist'} 
                    onClick={() => setActiveView('persist')}
                    icon={<Database className="w-4 h-4" />}
                    label="Bloco de Persistência"
                  />
                </div>
              </aside>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto bg-[#111111] p-8">
                <div className="max-w-4xl mx-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeView}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {activeView === 'resumo' && (
                        <div className="space-y-8">
                          <HeaderSection title="Resumo do Processo" subtitle="Visão macro e valor de negócio" />
                          <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 p-6 rounded-2xl">
                             <p className="text-zinc-200 leading-relaxed text-xl font-light italic">
                              {analysis.resumoProcesso}
                            </p>
                          </div>
                        </div>
                      )}

                      {activeView === 'etapas' && (
                        <div className="space-y-6">
                          <HeaderSection title="Etapas Principais" subtitle="Marcos fundamentais da automação" />
                          <div className="space-y-4">
                            {analysis.etapasPrincipais?.map((step, i) => (
                              <div key={i} className="flex gap-4 group">
                                <div className="flex flex-col items-center">
                                  <div className="w-8 h-8 rounded-full border border-blue-500/50 flex items-center justify-center text-xs font-mono bg-blue-500/10 text-blue-400">
                                    {i + 1}
                                  </div>
                                  {i < analysis.etapasPrincipais.length - 1 && (
                                    <div className="w-px h-full bg-[#333] my-1" />
                                  )}
                                </div>
                                <div className="pb-6">
                                  <p className="text-zinc-200 mt-1">{step}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeView === 'regras' && (
                        <div className="space-y-6">
                          <HeaderSection title="Regras Críticas e Exceções" subtitle="Lógica de negócio e desvios" />
                          <div className="grid gap-4">
                            {analysis.regrasExcecoes?.map((item, i) => (
                              <div key={i} className="bg-[#1a1a1a] border border-[#333] p-5 rounded-lg border-l-2 border-l-blue-500/50">
                                <h4 className="text-sm font-semibold uppercase tracking-tight text-blue-400 mb-2">Regra / Cenário</h4>
                                <p className="text-zinc-200 mb-4">{item.descricao}</p>
                                <div className="bg-black/20 p-3 rounded border border-zinc-800">
                                  <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">Contexto e Impacto</span>
                                  <p className="text-zinc-400 text-xs">{item.contexto}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeView === 'atencao' && (
                        <div className="space-y-6">
                          <HeaderSection title="Pontos de Atenção" subtitle="Riscos e alertas técnicos detalhados" />
                          <div className="grid gap-6">
                            {analysis.pontosAtencao?.map((point, i) => (
                              <div key={i} className="bg-[#1a1a1a] border border-[#333] border-l-2 border-l-red-500/50 rounded-xl overflow-hidden shadow-xl">
                                <div className="p-4 bg-zinc-900/50 flex items-center gap-3 border-b border-[#333]">
                                  <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  </div>
                                  <h4 className="text-sm font-semibold text-zinc-100 uppercase tracking-tight">Ponto Crítico #{i + 1}</h4>
                                </div>
                                <div className="p-6 space-y-4">
                                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/10 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-red-500" />
                                      <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest">Risco</span>
                                    </div>
                                    <p className="text-zinc-200 text-sm leading-relaxed">{point.risco}</p>
                                  </div>
                                  
                                  <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/10 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                                      <span className="text-[10px] uppercase font-bold text-blue-400 tracking-widest">Causa Raiz</span>
                                    </div>
                                    <p className="text-zinc-300 text-sm leading-relaxed">{point.causa}</p>
                                  </div>

                                  <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/10 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest">Impacto na Automação</span>
                                    </div>
                                    <p className="text-zinc-300 text-sm leading-relaxed">{point.impacto}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeView === 'escopo' && (
                        <div className="space-y-6">
                          <HeaderSection title="Escopo" subtitle="Sistemas, acessos e volumes" />
                          <div className="grid sm:grid-cols-2 gap-4">
                            {analysis.escopo?.map((item, i) => (
                              <div key={i} className="bg-[#1a1a1a] border border-[#333] p-4 rounded-lg">
                                <h4 className="text-xs font-mono uppercase text-blue-400 mb-1">{item.categoria}</h4>
                                <p className="text-zinc-300 text-sm">{item.descricao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeView === 'gaps' && (
                        <div className="space-y-6">
                          <HeaderSection title="Possíveis Gaps" subtitle="Lacunas e inconsistências no PDD" />
                          <div className="space-y-4">
                            {analysis.gaps?.map((gap, i) => (
                              <div key={i} className="flex items-start gap-4 p-4 bg-[#1a1a1a] border border-[#333] rounded-xl">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" />
                                <p className="text-zinc-300 leading-relaxed italic font-serif">
                                  "{gap}"
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeView === 'qa' && analysis.validacaoQA && (
                        <div className="space-y-8">
                          <HeaderSection title="Validação QA" subtitle="Estratégias de teste e qualidade" />
                          
                          <div className="grid lg:grid-cols-2 gap-6">
                            <QACard 
                              title="Como Validar" 
                              description="Sugestões para validar os pontos de atenção"
                              items={analysis.validacaoQA.sugestoesValidacao}
                              icon={<Settings className="w-4 h-4 text-blue-400" />}
                            />
                            <QACard 
                              title="Complementos PDD" 
                              description="Onde a documentação pode ser melhorada"
                              items={analysis.validacaoQA.complementosPDD}
                              icon={<FileUp className="w-4 h-4 text-emerald-400" />}
                            />
                            <QACard 
                              title="Atuação QA" 
                              description="Ações para reduzir lacunas e riscos"
                              items={analysis.validacaoQA.atuacaoQA}
                              icon={<User className="w-4 h-4 text-amber-400" />}
                            />
                            <QACard 
                              title="Perguntas T2A" 
                              description="Verificações adicionais para discussão"
                              items={analysis.validacaoQA.perguntasT2A}
                              icon={<MessageSquareQuote className="w-4 h-4 text-purple-400" />}
                            />
                          </div>
                        </div>
                      )}

                      {activeView === 'persist' && analysis?.persistenceBlock && (
                        <div className="space-y-6">
                          <HeaderSection title="Bloco de Persistência" subtitle="Dados para armazenamento e histórico" />
                          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden">
                            <div className="p-6 bg-zinc-900/50 border-b border-[#333] flex justify-between items-center">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Informações de Sessão</span>
                              <button 
                                onClick={() => {
                                  const text = JSON.stringify(analysis.persistenceBlock, null, 2);
                                  navigator.clipboard.writeText(text);
                                  alert('Copiado para a área de transferência!');
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                              >
                                <Save className="w-3 h-3" /> Copiar JSON
                              </button>
                            </div>
                            <div className="p-6 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] uppercase text-zinc-500 font-mono">Usuário</label>
                                  <p className="text-zinc-200 text-sm">{analysis.persistenceBlock.usuario}</p>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-zinc-500 font-mono">Perfil</label>
                                  <p className="text-zinc-200 text-sm">{analysis.persistenceBlock.perfil}</p>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-zinc-500 font-mono">Data</label>
                                  <p className="text-zinc-200 text-sm">{analysis.persistenceBlock.data}</p>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-zinc-500 font-mono">Processo</label>
                                  <p className="text-zinc-200 text-sm">{analysis.persistenceBlock.processo}</p>
                                </div>
                              </div>
                              <div className="pt-4 border-t border-[#333] space-y-4">
                                <div>
                                  <label className="text-[10px] uppercase text-zinc-500 font-mono">Resumo do Objetivo</label>
                                  <p className="text-zinc-300 text-sm italic">{analysis.persistenceBlock.resumo}</p>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-zinc-500 font-mono">Regras Críticas</label>
                                  <p className="text-zinc-300 text-sm">{analysis.persistenceBlock.regrasCriticas}</p>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-zinc-500 font-mono">Pontos de Atenção</label>
                                  <p className="text-zinc-300 text-sm">{analysis.persistenceBlock.pontosAtencao}</p>
                                </div>
                                <div>
                                  <label className="text-[10px] uppercase text-zinc-500 font-mono">Gaps Identificados</label>
                                  <p className="text-zinc-300 text-sm">{analysis.persistenceBlock.gaps}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="px-8 py-4 border-t border-[#333] bg-[#0a0a0a] flex justify-between items-center">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">PDD Insight Engine v1.0.0</p>
        <div className="flex gap-4 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
          <span>T2A SPECIALIST</span>
          <div className="w-1 h-3 bg-blue-600 rounded-full" />
        </div>
      </footer>
    </div>
  );
}

function QACard({ title, description, items, icon }: { title: string, description: string, items: string[], icon: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden shadow-xl group hover:border-zinc-700 transition-colors">
      <div className="p-4 bg-zinc-900 flex items-center justify-between border-b border-[#333]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/40 rounded-lg">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-100">{title}</h4>
            <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {items?.map((item, i) => (
          <div key={i} className="flex gap-3 items-start group/item">
            <div className="mt-1.5 w-1 h-1 rounded-full bg-zinc-700 group-hover/item:bg-blue-500 transition-colors" />
            <p className="text-xs text-zinc-400 leading-relaxed group-hover/item:text-zinc-200 transition-colors">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all whitespace-nowrap
        ${active ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HeaderSection({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="mb-8">
      <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1 font-mono">{subtitle}</p>}
      <div className="h-px w-12 bg-blue-600 mt-4" />
    </div>
  );
}
