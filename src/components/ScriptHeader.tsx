import React, { useState } from 'react';
import { ComicScript } from '../types.ts';
import { RefreshCw, Download, Upload, Plus, User, Edit3, FilePlus } from 'lucide-react';
import { exportScriptToPDF } from '../utils/pdfGenerator.ts';

interface ScriptHeaderProps {
  script: ComicScript;
  onUpdateMetadata: (key: 'title' | 'author' | 'description' | 'treatment', value: string) => void;
  onExportJSON: () => void;
  onImportJSON: (jsonString: string) => boolean;
  onReset: () => void;
  onNewScript: () => void;
  onAddPage: () => void;
}

export const ScriptHeader: React.FC<ScriptHeaderProps> = ({
  script,
  onUpdateMetadata,
  onExportJSON,
  onImportJSON,
  onReset,
  onNewScript,
  onAddPage,
}) => {
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importError, setImportError] = useState('');

  // Calculate statistics
  const pageCount = script.pages.length;
  let panelCount = 0;
  let wordCount = 0;

  script.pages.forEach(p => {
    panelCount += p.panels.length;
    p.panels.forEach(pan => {
      wordCount += (pan.action.split(/\s+/).filter(Boolean).length) +
                  (pan.dialogues.split(/\s+/).filter(Boolean).length) +
                  (pan.captions.split(/\s+/).filter(Boolean).length);
    });
  });

  const handleImportSubmit = () => {
    setImportError('');
    const success = onImportJSON(importText);
    if (success) {
      setImportText('');
      setShowImportArea(false);
    } else {
      setImportError('Erro de parsing: verifique se o JSON fornecido respeita a especificação do Roteiro.');
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-xs">
      
      {/* Top Thin Design Bar - Absolute Geometric Balance Spec */}
      <div className="h-14 bg-white border-b border-gray-150 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          {/* Logo Unit */}
          <div className="w-8 h-8 bg-black rounded-xs flex items-center justify-center text-white font-bold text-xs italic tracking-widest">
            INK
          </div>
          {/* Folder Path Title Segment */}
          <h1 className="text-xs font-semibold tracking-wider text-gray-400 uppercase hidden sm:block">
            GEOMETRIC_BALANCE / <span className="text-black font-bold tracking-tight">{script.title || "ROTEIRO"}</span> {script.treatment && <span className="text-blue-600 bg-blue-50 border border-blue-100 text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 tracking-normal">{script.treatment.toUpperCase()}</span>}
          </h1>
          <h1 className="text-xs font-bold text-black sm:hidden">
            {script.title || "ROTEIRO"} {script.treatment && `(${script.treatment})`}
          </h1>
        </div>

        <div className="flex items-center gap-5">
          {/* Active status representation badge */}
          <span className="px-2.5 py-1 bg-gray-100 text-[9px] font-bold rounded-sm uppercase tracking-widest border border-gray-200 text-gray-600">
            DRAFT_ACTIVE_HQ
          </span>
          {/* Geometric Circle Cluster indicator */}
          <div className="flex gap-2.5 border-l pl-5 border-gray-200">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-500" title="Matriz Sincronizada"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" title="Metadados Ativos"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-yellow-400" title="Validado McCabe"></div>
          </div>
        </div>
      </div>

      {/* Main Action and Meta Bar */}
      <div className="w-full px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Left Side: Metadata and Description view / edit */}
        <div className="flex-1 w-full">
          {isEditingMeta ? (
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Título da Obra</label>
                  <input
                    value={script.title}
                    onChange={(e) => onUpdateMetadata('title', e.target.value)}
                    className="w-full text-xs font-bold bg-white px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Autor / Roteirista</label>
                  <input
                    value={script.author}
                    onChange={(e) => onUpdateMetadata('author', e.target.value)}
                    className="w-full text-xs bg-white px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Tratamento / Versão</label>
                  <input
                    value={script.treatment || ''}
                    onChange={(e) => onUpdateMetadata('treatment', e.target.value)}
                    className="w-full text-xs bg-white px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Ex: 1º Tratamento, Rascunho final..."
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Sinopse da Cena / Logline</label>
                <input
                  value={script.description}
                  onChange={(e) => onUpdateMetadata('description', e.target.value)}
                  className="w-full text-xs bg-white px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ex: Noite chuvosa em Gotham..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsEditingMeta(false)}
                  className="text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
                >
                  Confirmar Metadados
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {script.title || "Roteiro de HQ Sem Título"}
                </h2>
                {script.treatment && (
                  <span className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded">
                    {script.treatment}
                  </span>
                )}
                <button
                  onClick={() => setIsEditingMeta(true)}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-slate-100 transition-all font-semibold flex items-center gap-1 text-[11px]"
                  title="Editar metadados"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium hidden group-hover:inline">Editar Info</span>
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Roteirista: <strong className="text-slate-800 font-semibold">{script.author || "Anônimo"}</strong></span>
                </span>
                {script.description && (
                  <span className="text-slate-400 truncate max-w-sm sm:max-w-md hidden sm:inline">
                    • {script.description}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Command button array in Geometric Balance style */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={onNewScript}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-wider shadow-sm transition-all hover:shadow-md"
            title="Criar um roteiro totalmente novo e em branco"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Novo Roteiro</span>
          </button>

          <button
            onClick={onAddPage}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Página</span>
          </button>

          <button
            onClick={() => exportScriptToPDF(script)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-sm transition-colors uppercase tracking-wider shadow-sm transition-all hover:shadow-md"
            title="Exportar roteiro completo formatado para arquivo PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-sm transition-colors uppercase tracking-wider"
            title="Redefinir para roteiro modelo"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden lg:inline">Recomeçar</span>
          </button>

          <button
            onClick={onExportJSON}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-sm transition-colors uppercase tracking-wider"
            title="Exportar arquivo plano JSON"
          >
            <Download className="w-3 h-3" />
            <span className="hidden lg:inline">Exportar JSON</span>
          </button>

          <button
            onClick={() => setShowImportArea(!showImportArea)}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-sm transition-colors uppercase tracking-wider"
            title="Importar de string JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Importar</span>
          </button>
        </div>
      </div>

      {/* Structured Statistics Horizontal Bar */}
      <div className="bg-slate-50 border-t border-gray-150 py-3.5 px-6">
        <div className="w-full flex flex-wrap items-center gap-7">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">PÁGINAS GERAIS</span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-3xs">{pageCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">PAINÉIS TOTAIS</span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-3xs">{panelCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">MÉDIA DE QUADROS / PÁG</span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-3xs">
              {pageCount > 0 ? (panelCount / pageCount).toFixed(1) : 0}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono hidden md:inline">PALAVRAS / CORPUS</span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-3xs hidden md:inline">{wordCount}</span>
          </div>
        </div>
      </div>

      {/* Expandable Import Container */}
      {showImportArea && (
        <div className="p-5 bg-slate-100 border-b border-gray-200">
          <div className="max-w-4xl mx-auto space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Carregar Roteiro Estruturado (.json)</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Insira abaixo o código em formato JSON para restaurar integralmente a listagem matricial e os metadados associados à sua obra de arte sequencial.
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='Cole o arquivo exportado aqui... Ex: {"title": "Minha HQ", "pages": [...] }'
              className="w-full text-xs font-mono h-28 p-2.5 border border-gray-200 bg-white rounded-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            {importError && (
              <p className="text-xs text-rose-600 font-medium">{importError}</p>
            )}
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowImportArea(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded hover:bg-slate-200 transition-colors text-[10px] uppercase font-bold tracking-wider"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[10px] uppercase font-bold tracking-wider"
              >
                Efetuar Carga de Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
