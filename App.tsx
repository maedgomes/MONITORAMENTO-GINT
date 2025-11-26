import React, { useState } from 'react';
import { 
  Shield, FileText, Plus, Trash2, CheckCircle, Share2, 
  Wand2, Loader2, Bot, RefreshCw, Calendar, CheckSquare, 
  Square, Edit2, Link as LinkIcon, FileSpreadsheet, Copy, Filter, Download, Globe, Search, AlertCircle
} from 'lucide-react';

import { Header } from './components/Header';
import { fetchNews, resolveRealUrl, shortenUrl } from './services/newsService';
import { analyzeText, performGroundingSearch } from './services/geminiService';
import { generatePDF } from './services/pdfService';
import { 
  getLocalDateString, formatDateDisplay, generateTextReport, 
  copyToClipboardHelper, getMonthAbbr, getDayOnly 
} from './utils';
import { NewsItem, BotResultItem, FormDataState, GroundingSearchResult } from './types';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'busca' | 'relatorio'>('busca');

  // Search State
  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');
  const [botResults, setBotResults] = useState<BotResultItem[]>([]);
  const [isSearchingBot, setIsSearchingBot] = useState(false);
  const [botError, setBotError] = useState('');

  // News List State
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  // Filter & Report State
  const [filterDate, setFilterDate] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // AI & Form State
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState<FormDataState>({
    titulo: '',
    fonte: '',
    resumo: '',
    conteudo: '',
    link: '',
    data: getLocalDateString()
  });

  // Grounding Search State
  const [groundingQuery, setGroundingQuery] = useState('');
  const [isGrounding, setIsGrounding] = useState(false);
  const [groundingResult, setGroundingResult] = useState<GroundingSearchResult | null>(null);

  // --- Handlers ---

  const handleRunBotSearch = async () => {
    setIsSearchingBot(true);
    setBotError('');
    setBotResults([]);
    try {
      const results = await fetchNews(searchStartDate, searchEndDate);
      setBotResults(results);
      if (results.length === 0) setBotError("Nenhuma notícia encontrada com os critérios.");
    } catch (err: any) {
      setBotError(err.message);
    } finally {
      setIsSearchingBot(false);
    }
  };

  const handleToggleNewsSelection = async (botItem: BotResultItem) => {
    const exists = newsList.find(item => item.link === botItem.link || (item.originalLink && item.originalLink === botItem.link));
    
    if (exists) {
      setNewsList(prev => prev.filter(item => item.link !== botItem.link && item.originalLink !== botItem.link));
    } else {
      const newItem: NewsItem = {
        id: Date.now(),
        titulo: botItem.title,
        fonte: botItem.source,
        resumo: botItem.snippet, 
        conteudo: botItem.snippet + "\n\n(Edite para colar o texto completo da matéria, se necessário.)",
        link: botItem.link, 
        originalLink: botItem.link, 
        data: botItem.pubDate,
        isShortening: true 
      };
      
      setNewsList(prev => [...prev, newItem]);

      // Process Link in background
      try {
        const realUrl = await resolveRealUrl(botItem.link);
        const shortLink = await shortenUrl(realUrl);
        setNewsList(prev => prev.map(item => {
          if (item.id === newItem.id) return { ...item, link: shortLink, isShortening: false };
          return item;
        }));
      } catch (e) {
        setNewsList(prev => prev.map(item => {
          if (item.id === newItem.id) return { ...item, isShortening: false };
          return item;
        }));
      }
    }
  };

  const isSelected = (link: string) => newsList.some(item => item.link === link || item.originalLink === link);

  const handleAnalyzeWithAI = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeText(rawText);
      setFormData(prev => ({
        ...prev,
        titulo: result.titulo || prev.titulo,
        fonte: result.fonte || prev.fonte,
        resumo: result.resumo || prev.resumo,
        conteudo: rawText, 
        data: result.data || prev.data
      }));
      setRawText('');
    } catch (error) {
      alert("Erro ao processar com IA. Verifique se a chave de API está configurada.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGroundingSearch = async () => {
    if (!groundingQuery.trim()) return;
    setIsGrounding(true);
    setGroundingResult(null);
    try {
      const result = await performGroundingSearch(groundingQuery);
      setGroundingResult(result);
    } catch (error) {
      alert("Erro ao realizar pesquisa na web.");
    } finally {
      setIsGrounding(false);
    }
  };

  const handleAddGroundingToReport = () => {
    if (!groundingResult) return;

    const sourcesFormatted = groundingResult.sources.length > 0 
      ? groundingResult.sources.map(s => `${s.title} (${s.uri})`).join('\n')
      : '';

    const newItem: NewsItem = {
      id: Date.now(),
      titulo: `Pesquisa: ${groundingQuery}`,
      fonte: 'Assistente Web (IA)',
      resumo: groundingResult.text,
      conteudo: `${groundingResult.text}\n\nFontes Consultadas:\n${sourcesFormatted}`,
      link: groundingResult.sources[0]?.uri || '',
      data: getLocalDateString(),
      isShortening: false
    };

    setNewsList(prev => [...prev, newItem]);
    setGroundingResult(null); 
    setGroundingQuery('');
  };

  const handleAddManualNews = () => {
    if (!formData.titulo) return;
    setNewsList([...newsList, { ...formData, id: Date.now() }]);
    setFormData({ 
      titulo: '', fonte: '', resumo: '', conteudo: '', link: '',
      data: getLocalDateString()
    });
  };

  const handleEditChange = (id: string | number, field: keyof NewsItem, value: string) => {
    setNewsList(prev => prev.map(item => {
      if (item.id === id) return { ...item, [field]: value };
      return item;
    }));
  };

  // --- Export Functions ---

  const sortedFilteredList = newsList
    .filter(item => !filterDate || item.data === filterDate)
    .sort((a, b) => {
      if (b.data < a.data) return -1;
      if (b.data > a.data) return 1;
      return 0;
    });

  const handleExportCSV = () => {
    const BOM = "\uFEFF"; 
    const headers = ["Data", "Fonte", "Título", "Resumo", "Link", "Conteúdo Completo"];
    const csvRows = sortedFilteredList.map(item => {
      const safe = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
      return [
        formatDateDisplay(item.data),
        safe(item.fonte),
        safe(item.titulo),
        safe(item.resumo),
        safe(item.link),
        safe(item.conteudo)
      ].join(",");
    });
    const csvContent = BOM + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Relatorio_GINT.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTable = async () => {
    const headers = "Data\tFonte\tTítulo\tResumo\tLink\tConteúdo Completo";
    const rows = sortedFilteredList.map(item => {
      const clean = (text: string) => (text || '').replace(/(\r\n|\n|\r)/gm, " ");
      return `${formatDateDisplay(item.data)}\t${item.fonte}\t${item.titulo}\t${clean(item.resumo)}\t${item.link}\t${clean(item.conteudo)}`;
    }).join("\n");
    
    const success = await copyToClipboardHelper(`${headers}\n${rows}`);
    if (success) {
      setCopySuccess('Tabela copiada (Excel)');
      setTimeout(() => setCopySuccess(''), 4000);
    }
  };

  const handleCopySummary = async () => {
    const text = generateTextReport(sortedFilteredList);
    const success = await copyToClipboardHelper(text);
    if (success) {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex gap-1 border-b border-slate-200 bg-white rounded-t-lg px-2 pt-2 shadow-sm">
          <button 
            onClick={() => setActiveTab('busca')}
            className={`px-6 py-3 flex items-center gap-2 font-semibold transition-colors border-b-2 text-sm ${
              activeTab === 'busca' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bot size={18} /> Coleta & Seleção
          </button>
          <button 
            onClick={() => setActiveTab('relatorio')}
            className={`px-6 py-3 flex items-center gap-2 font-semibold transition-colors border-b-2 text-sm ${
              activeTab === 'relatorio' ? 'border-amber-500 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText size={18} /> Relatório Final <span className={`px-2 py-0.5 rounded-full text-xs ml-1 ${newsList.length > 0 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-200 text-slate-700'}`}>{newsList.length}</span>
          </button>
        </div>

        {/* Tab Content: BUSCA */}
        {activeTab === 'busca' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Automated Search */}
            <div className="lg:col-span-6 flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
              <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm uppercase tracking-wider text-slate-700 font-bold flex items-center gap-2">
                    <RefreshCw className="text-amber-600" size={18} /> Radar de Notícias
                  </h2>
                  <span className="text-[10px] font-medium bg-slate-100 px-2 py-1 rounded text-slate-500">Google News RSS</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-md mb-4 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-600 mb-2 uppercase flex items-center gap-1">
                    <Calendar size={12} /> Período de Busca
                  </p>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="date" 
                      value={searchStartDate}
                      onChange={(e) => setSearchStartDate(e.target.value)}
                      className="flex-1 p-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-amber-400 outline-none text-slate-600 font-medium"
                    />
                    <span className="text-slate-400 text-xs">até</span>
                    <input 
                      type="date" 
                      value={searchEndDate}
                      onChange={(e) => setSearchEndDate(e.target.value)}
                      className="flex-1 p-2 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-amber-400 outline-none text-slate-600 font-medium"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={handleRunBotSearch} 
                  disabled={isSearchingBot} 
                  className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold py-3 px-4 rounded-md transition-all flex justify-center items-center gap-2 mb-4 text-sm shadow-sm"
                >
                  {isSearchingBot ? <><Loader2 className="animate-spin" size={16} /> ANALISANDO FONTES...</> : "ATUALIZAR RADAR"}
                </button>

                {botError && (
                  <div className="text-xs text-red-600 bg-red-50 p-3 rounded mb-3 border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14}/> {botError}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {botResults.map((item, idx) => {
                    const selected = isSelected(item.link);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => handleToggleNewsSelection(item)} 
                        className={`p-3 border rounded-lg transition-all cursor-pointer relative group ${selected ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-300' : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'}`}
                      >
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{item.source}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{item.pubDateDisplay}</span>
                        </div>
                        <div className="flex gap-3 items-start mt-2">
                           <div className={`mt-0.5 transition-colors ${selected ? 'text-amber-600' : 'text-slate-300'}`}>
                              {selected ? <CheckSquare size={18} fill="currentColor" className="text-amber-100" /> : <Square size={18} />}
                           </div>
                           <div className="flex-1">
                              <h4 className={`text-sm font-semibold leading-snug mb-1 ${selected ? 'text-slate-900' : 'text-slate-700'}`}>{item.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.snippet}</p>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {!isSearchingBot && botResults.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs opacity-60">
                      <div className="bg-slate-100 p-4 rounded-full mb-3">
                        <RefreshCw size={24} />
                      </div>
                      <p>O radar está aguardando comando.</p>
                      <p className="mt-1">Defina as datas e clique em Atualizar.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: AI Processing & Manual Entry */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Info Card */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-lg flex gap-3 items-start shadow-sm">
                <div className="bg-white p-1.5 rounded-full shadow-sm text-amber-600 mt-0.5">
                  <CheckCircle size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Modo de Seleção Rápida</h3>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Clique nas notícias do radar para adicionar à lista. O sistema encurtará os links e removerá rastreadores automaticamente.
                  </p>
                </div>
              </div>

              {/* AI Text Processor */}
              <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
                    <Wand2 size={16} />
                  </div>
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">IA - Processador de Texto</span>
                </div>
                <div className="flex gap-2">
                  <textarea 
                    value={rawText} 
                    onChange={(e) => setRawText(e.target.value)} 
                    placeholder="Cole aqui um texto bruto para que a IA extraia o título, resumo e fonte automaticamente..." 
                    className="flex-1 h-32 p-3 text-xs border border-indigo-100 rounded bg-indigo-50/30 focus:bg-white focus:border-indigo-300 resize-none outline-none transition-all placeholder:text-slate-400"
                  ></textarea>
                  <button 
                    onClick={handleAnalyzeWithAI} 
                    disabled={isAnalyzing || !rawText.trim()} 
                    className="w-24 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded flex flex-col justify-center items-center gap-2 transition-colors shadow-sm"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : "Processar"}
                  </button>
                </div>
              </div>

               {/* AI Search Assistant (Web Grounding) */}
               <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-teal-100 rounded text-teal-600">
                    <Globe size={16} />
                  </div>
                  <span className="text-xs font-bold text-teal-900 uppercase tracking-wide">Assistente de Pesquisa (Web)</span>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    value={groundingQuery}
                    onChange={(e) => setGroundingQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGroundingSearch()}
                    placeholder="Ex: Estatísticas de homicídios no ES em 2024..."
                    className="flex-1 p-2 text-xs border border-teal-100 rounded bg-teal-50/30 focus:bg-white focus:border-teal-300 outline-none transition-all"
                  />
                  <button 
                    onClick={handleGroundingSearch}
                    disabled={isGrounding || !groundingQuery.trim()}
                    className="w-24 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                     {isGrounding ? <Loader2 className="animate-spin" size={14} /> : <><Search size={14}/> Pesquisar</>}
                  </button>
                </div>

                {groundingResult && (
                  <div className="bg-teal-50 border border-teal-100 rounded p-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-xs text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">
                      {groundingResult.text}
                    </div>
                    {groundingResult.sources.length > 0 && (
                      <div className="border-t border-teal-200 pt-2 mb-3">
                        <p className="text-[10px] font-bold text-teal-800 mb-1">Fontes Encontradas:</p>
                        <ul className="space-y-1">
                          {groundingResult.sources.map((source, idx) => (
                            <li key={idx}>
                              <a href={source.uri} target="_blank" rel="noreferrer" className="text-[10px] text-teal-600 hover:underline flex items-center gap-1 truncate">
                                <LinkIcon size={8} /> {source.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <button 
                      onClick={handleAddGroundingToReport}
                      className="w-full bg-teal-100 hover:bg-teal-200 text-teal-800 border border-teal-200 font-bold py-2 rounded text-xs flex justify-center items-center gap-2 transition-colors"
                    >
                      <Plus size={14} /> Adicionar ao Relatório
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Entry Form */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <Plus className="text-slate-400" size={16} /> Cadastro Manual
                </h2>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    name="titulo" 
                    value={formData.titulo} 
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})} 
                    className="w-full p-2.5 border border-slate-300 rounded font-semibold text-sm outline-none focus:border-slate-500 transition-colors" 
                    placeholder="Título da Notícia..." 
                  />
                  <div className="grid grid-cols-2 gap-3">
                     <input 
                        type="date" 
                        name="data" 
                        value={formData.data} 
                        onChange={(e) => setFormData({...formData, data: e.target.value})} 
                        className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-slate-500" 
                      />
                     <input 
                        type="text" 
                        name="fonte" 
                        value={formData.fonte} 
                        onChange={(e) => setFormData({...formData, fonte: e.target.value})} 
                        className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-slate-500" 
                        placeholder="Nome da Fonte/Veículo..." 
                      />
                  </div>
                  <textarea 
                    name="resumo" 
                    value={formData.resumo} 
                    onChange={(e) => setFormData({...formData, resumo: e.target.value})} 
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-slate-500 h-20 resize-none" 
                    placeholder="Resumo curto para o relatório de tópicos..." 
                  />
                  <textarea 
                    name="conteudo" 
                    value={formData.conteudo} 
                    onChange={(e) => setFormData({...formData, conteudo: e.target.value})} 
                    rows={4} 
                    className="w-full p-2.5 border border-slate-300 rounded text-xs outline-none focus:border-slate-500 resize-none" 
                    placeholder="Conteúdo Completo (Opcional, para exportação de Excel)..."
                  ></textarea>
                  
                  <button 
                    onClick={handleAddManualNews} 
                    disabled={!formData.titulo} 
                    className="w-full bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 rounded text-sm transition-colors shadow-sm mt-2"
                  >
                    Adicionar à Lista
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: RELATÓRIO */}
        {activeTab === 'relatorio' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[600px] flex flex-col">
            
            {/* Toolbar */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Relatório Final</h2>
                <p className="text-slate-500 text-sm mt-1">Gerencie, edite e exporte as informações coletadas.</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <button 
                  onClick={() => setNewsList([])} 
                  disabled={newsList.length === 0}
                  className="text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  Limpar Tudo
                </button>
                
                <button 
                  onClick={handleCopyTable} 
                  disabled={sortedFilteredList.length === 0} 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded font-bold flex items-center gap-2 disabled:opacity-50 text-sm transition-all border border-slate-200"
                >
                  <Copy size={16} /> Tabela (Excel)
                </button>
                
                <button 
                  onClick={handleExportCSV} 
                  disabled={sortedFilteredList.length === 0} 
                  className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded shadow-sm font-bold flex items-center gap-2 disabled:opacity-50 text-sm transition-all"
                >
                  <FileSpreadsheet size={16} /> Baixar CSV
                </button>

                <button 
                  onClick={() => generatePDF(sortedFilteredList)} 
                  disabled={sortedFilteredList.length === 0} 
                  className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded shadow-sm font-bold flex items-center gap-2 disabled:opacity-50 text-sm transition-all"
                >
                  <Download size={16} /> Baixar PDF
                </button>
              </div>
            </div>

            {copySuccess && (
              <div className="mx-6 mt-6 bg-green-50 border border-green-200 text-green-800 p-3 rounded text-center text-sm font-bold flex justify-center items-center gap-2 animate-pulse">
                <CheckCircle size={16} /> {copySuccess}
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-slate-50 p-3 mx-6 mt-6 rounded border border-slate-200 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                 <Filter size={16} className="text-amber-600" /> Filtrar Data:
              </div>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="p-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-amber-300 outline-none bg-white text-slate-700"
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-red-600 text-xs font-bold hover:underline">
                  (Limpar)
                </button>
              )}
              
              <div className="ml-auto text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                Total: {sortedFilteredList.length} registros
              </div>
            </div>

            {/* List Content */}
            <div className="p-6 space-y-4 flex-1">
              {sortedFilteredList.length === 0 ? (
                <div className="text-center py-20 rounded border-2 border-dashed border-slate-200 bg-slate-50/50">
                   <div className="bg-slate-100 p-4 rounded-full inline-block mb-4">
                      <CheckSquare size={32} className="text-slate-300" />
                   </div>
                  <p className="text-slate-500 font-medium">
                    {filterDate ? "Nenhuma notícia encontrada nesta data." : "Nenhuma notícia selecionada."}
                  </p>
                  <button onClick={() => setActiveTab('busca')} className="mt-4 text-amber-600 hover:text-amber-700 hover:underline text-sm font-bold">
                    Voltar para Coleta
                  </button>
                </div>
              ) : (
                sortedFilteredList.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <div key={item.id} className={`flex gap-4 p-5 border rounded-lg relative group transition-all ${isEditing ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-200 shadow-md z-10' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      
                      {/* Date Block */}
                      <div className="hidden sm:flex flex-col items-center justify-start min-w-[70px] pt-1 border-r border-slate-100 pr-4">
                         <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{getMonthAbbr(item.data)}</span>
                         <span className="text-3xl font-black text-slate-700">{getDayOnly(item.data)}</span>
                         <span className="text-[10px] text-slate-300">{item.data.split('-')[0]}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-4 animate-in fade-in">
                             <div className="flex justify-between items-center">
                               <h3 className="text-xs font-bold text-amber-600 uppercase">Editando Registro</h3>
                               <button onClick={() => setEditingId(null)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-colors">
                                 Salvar Alterações
                               </button>
                             </div>
                             
                             <input 
                               type="text" 
                               value={item.titulo} 
                               onChange={(e) => handleEditChange(item.id, 'titulo', e.target.value)} 
                               className="w-full p-2 border border-amber-200 rounded font-bold text-slate-800 focus:ring-1 focus:ring-amber-300 outline-none"
                             />
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Resumo (Lista)</label>
                                 <textarea 
                                   value={item.resumo} 
                                   onChange={(e) => handleEditChange(item.id, 'resumo', e.target.value)} 
                                   className="w-full p-2 border border-amber-200 rounded text-sm text-slate-600 h-32 resize-none outline-none focus:ring-1 focus:ring-amber-300"
                                 />
                               </div>
                               <div>
                                 <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Conteúdo (Excel)</label>
                                 <textarea 
                                   value={item.conteudo} 
                                   onChange={(e) => handleEditChange(item.id, 'conteudo', e.target.value)} 
                                   className="w-full p-2 border border-amber-200 rounded text-sm text-slate-600 h-32 resize-none outline-none focus:ring-1 focus:ring-amber-300"
                                 />
                               </div>
                             </div>

                             <div className="flex gap-2">
                                <input 
                                   type="text" 
                                   value={item.fonte} 
                                   onChange={(e) => handleEditChange(item.id, 'fonte', e.target.value)} 
                                   className="w-1/3 p-2 border border-amber-200 rounded text-xs outline-none focus:ring-1 focus:ring-amber-300"
                                   placeholder="Fonte"
                                 />
                                 <input 
                                    type="text" 
                                    value={item.link} 
                                    onChange={(e) => handleEditChange(item.id, 'link', e.target.value)} 
                                    className="flex-1 p-2 border border-amber-200 rounded text-xs outline-none focus:ring-1 focus:ring-amber-300 text-slate-400"
                                    placeholder="URL"
                                  />
                             </div>
                          </div>
                        ) : (
                          <div className="relative pr-12">
                            <h3 className="font-bold text-base text-slate-800 mb-2 leading-tight">{item.titulo}</h3>
                            <p className="text-slate-600 text-sm mb-3 leading-relaxed">{item.resumo}</p>
                            
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wide text-[10px] border border-slate-200">{item.fonte}</span>
                              <span className="sm:hidden text-slate-400">{formatDateDisplay(item.data)}</span>
                              {item.link && (
                                <a href={item.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 max-w-[200px] truncate">
                                  {item.isShortening ? <Loader2 size={10} className="animate-spin" /> : <LinkIcon size={10} />}
                                  {item.link}
                                </a>
                              )}
                            </div>
                            
                            <div className="absolute top-0 right-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingId(item.id)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Editar"><Edit2 size={16}/></button>
                              <button onClick={() => setNewsList(prev => prev.filter(n => n.id !== item.id))} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remover"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Copy Footer */}
            {sortedFilteredList.length > 0 && (
              <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-lg">
                <div className="flex flex-col items-center justify-center">
                  <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Compartilhamento Rápido (WhatsApp)</p>
                  <button 
                    onClick={handleCopySummary} 
                    className={`px-8 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${copiedSummary ? 'bg-green-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                  >
                    {copiedSummary ? "Conteúdo Copiado!" : <><Share2 size={16} /> Copiar Lista Resumida</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}