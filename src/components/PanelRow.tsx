import React, { useRef, useEffect } from 'react';
import { Panel } from '../types.ts';
import { Trash2, ChevronUp, ChevronDown, Plus, Users, Sparkles } from 'lucide-react';

interface PanelRowProps {
  panel: Panel;
  pageIndex: number;
  panelIndex: number;
  totalPanelsInPage: number;
  isActive?: boolean;
  onFocus?: () => void;
  characterNames?: string[];
  onImproveField?: (field: 'action' | 'dialogues' | 'captions', value: string) => void;
  onUpdate: (field: keyof Omit<Panel, 'id' | 'number'>, value: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
}

export const PanelRow: React.FC<PanelRowProps> = ({
  panel,
  pageIndex,
  panelIndex,
  totalPanelsInPage,
  isActive = false,
  onFocus,
  characterNames = [],
  onImproveField,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onInsertBefore,
  onInsertAfter,
}) => {
  // References to auto-resize the textareas
  const actionRef = useRef<HTMLTextAreaElement>(null);
  const dialogueRef = useRef<HTMLTextAreaElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(textarea.scrollHeight, 110)}px`;
    }
  };

  // Adjust heights whenever content shifts
  useEffect(() => {
    adjustHeight(actionRef.current);
    adjustHeight(dialogueRef.current);
    adjustHeight(captionRef.current);
  }, [panel.action, panel.dialogues, panel.captions]);

  // Handle auto-formatting shortcuts inside inputs
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: keyof Omit<Panel, 'id' | 'number'>
  ) => {
    if (field === 'dialogues' && e.key === 'Enter') {
      const cursorPosition = e.currentTarget.selectionStart;
      const textBefore = e.currentTarget.value.slice(0, cursorPosition);
      const lines = textBefore.split('\n');
      const lastLine = lines[lines.length - 1].trim();

      // Simple screenplay-style helper
      if (lastLine && !lastLine.includes('(') && lastLine === lastLine.toUpperCase()) {
        // Can optionally insert brackets for parentheticals
      }
    }
  };

  const insertCharacter = (name: string) => {
    const textarea = dialogueRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    let insertion = name + "\n";
    if (start > 0 && currentText[start - 1] !== '\n') {
      insertion = "\n" + name + "\n";
    }

    const newText = currentText.substring(0, start) + insertion + currentText.substring(end);
    onUpdate('dialogues', newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertCaptionOrSfx = (prefix: 'LEGENDA:' | 'SFX:') => {
    const textarea = captionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    let insertion = prefix + " ";
    if (start > 0 && currentText[start - 1] !== '\n') {
      insertion = "\n" + prefix + " ";
    }

    const newText = currentText.substring(0, start) + insertion + currentText.substring(end);
    onUpdate('captions', newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertion.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div 
      id={`panel-row-${panel.id}`} 
      onFocus={onFocus}
      onClick={onFocus}
      className={`group relative border-b transition-all duration-200 ${
        isActive 
          ? 'bg-blue-50/25 border-blue-200 ring-1 ring-blue-50/50' 
          : 'bg-white hover:bg-slate-50/50 border-gray-100'
      }`}
    >
      {/* Decorative focus marker from Geometric Balance */}
      {isActive && (
        <div className="absolute left-0 top-0 w-1.5 h-full bg-blue-600 z-10 transition-all duration-300"></div>
      )}

      {/* Mini Sidebar actions for panel management, visible on hover */}
      <div className="absolute left-1.5 top-3 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded shadow-xs p-1 z-10 md:flex">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={panelIndex === 0}
          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded hover:bg-gray-150"
          title="Mover painel para cima"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={panelIndex === totalPanelsInPage - 1}
          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 rounded hover:bg-gray-150"
          title="Mover painel para baixo"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onInsertBefore(); }}
          className="p-1 text-sky-500 hover:text-sky-700 rounded hover:bg-sky-50"
          title="Inserir painel antes"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
          title="Deletar painel"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-px bg-gray-100">
        {/* Panel label/ID column */}
        <div className={`md:col-span-1 p-3 flex md:flex-col justify-between items-center border-r border-gray-150 transition-colors ${
          isActive ? 'bg-blue-50/10' : 'bg-white'
        }`}>
          <div className="text-center md:pt-2">
            <span className={`text-[9px] uppercase font-bold tracking-wider ${isActive ? 'text-blue-500' : 'text-slate-400'}`}>PAINEL</span>
            <div className={`text-2xl font-mono font-bold mt-0.5 ${isActive ? 'text-blue-800 scale-105 transition-transform' : 'text-slate-700'}`}>
              {panel.number}
            </div>
          </div>
          
          <div className="flex md:hidden gap-1">
            <button onClick={(e) => { e.stopPropagation(); onInsertBefore(); }} className="p-1 text-sky-500 rounded bg-gray-50"><Plus className="w-4 h-4" /></button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-rose-500 rounded bg-gray-50"><Trash2 className="w-4 h-4" /></button>
          </div>

          <div className="hidden md:block pb-2">
            <span className="text-[8px] font-mono text-gray-400">P{pageIndex + 1}-N{panel.number}</span>
          </div>
        </div>

        {/* Column 1: Ação (Visão do cenário/quadrante) */}
        <div className={`md:col-span-4 p-3 relative transition-colors ${
          isActive ? 'bg-blue-50/5' : 'bg-white'
        }`}>
          <textarea
            ref={actionRef}
            value={panel.action}
            onChange={(e) => onUpdate('action', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'action')}
            onFocus={onFocus}
            placeholder="Descreva a ação visual aqui... Ex: 'Plano geral de Gotham à noite sob chuva ácida...'"
            className="w-full text-slate-800 text-[14px] leading-relaxed bg-transparent border-0 outline-none resize-none focus:ring-0 placeholder:text-slate-300 font-sans min-h-[110px]"
            id={`action-${panel.id}`}
          />
          {panel.action === '' ? (
            <div className="absolute bottom-2 right-2 text-[9px] text-zinc-300 pointer-events-none select-none font-mono">
              [Visual / Ação]
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onImproveField?.('action', panel.action);
              }}
              className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded flex items-center gap-1 text-[9px] font-bold text-indigo-700 uppercase transition-all tracking-wider shadow-2xs cursor-pointer z-10 animate-fade-in"
              title="Refinar escrita com IA"
            >
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              <span>Refinar ✨</span>
            </button>
          )}
        </div>

        {/* Column 2: Personagens e Diálogos/Falas */}
        <div className={`md:col-span-4 p-3 relative border-x border-gray-150 transition-colors flex flex-col justify-start ${
          isActive ? 'bg-blue-55/5' : 'bg-white'
        }`}>
          {/* Autocomplete / Dropdown de seleção de elenco estilo Final Draft */}
          {characterNames.length > 0 && (
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100/75 select-none shrink-0">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Falantes</span>
              
              <div className="relative group/char">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-slate-100 focus:bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-md text-[9px] uppercase transition-all shadow-2xs hover:border-slate-300 cursor-pointer"
                  title="Inserir personagem rápido como no Final Draft"
                >
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>Personagens ▽</span>
                </button>
                
                {/* Popover / Dropdown Menu */}
                <div className="absolute right-0 top-full mt-1 hidden group-hover/char:block bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 min-w-[160px] max-h-[180px] overflow-y-auto z-40 animate-fade-in divide-y divide-slate-50">
                  <div className="px-2 pb-1 text-[8px] font-extrabold text-slate-400 uppercase tracking-widest text-center select-none">
                    Elenco Salvo (Click)
                  </div>
                  {characterNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        insertCharacter(name);
                      }}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors uppercase flex items-center justify-between group/item cursor-pointer"
                    >
                      <span className="truncate">{name}</span>
                      <span className="text-[8px] text-indigo-500 font-bold tracking-wider uppercase opacity-0 group-hover/item:opacity-100 transition-opacity">
                        + ADD
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <textarea
            ref={dialogueRef}
            value={panel.dialogues}
            onChange={(e) => onUpdate('dialogues', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'dialogues')}
            onFocus={onFocus}
            placeholder="NOME DO PERSONAGEM&#13;(expressão)&#13;Diálogo aqui..."
            className="w-full text-zinc-800 text-[14px] leading-relaxed bg-transparent border-0 outline-none resize-none focus:ring-0 placeholder:text-zinc-300 font-sans tracking-wide min-h-[110px] flex-1"
            id={`dialogue-${panel.id}`}
          />
          {panel.dialogues === '' ? (
            <div className="absolute bottom-2 right-2 text-[9px] text-zinc-300 pointer-events-none select-none font-mono">
              [Personagem / Falas]
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onImproveField?.('dialogues', panel.dialogues);
              }}
              className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded flex items-center gap-1 text-[9px] font-bold text-indigo-700 uppercase transition-all tracking-wider shadow-2xs cursor-pointer z-10 animate-fade-in"
              title="Refinar escrita com IA"
            >
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              <span>Refinar ✨</span>
            </button>
          )}
        </div>

        {/* Column 3: Legendas e Efeitos Sonoros */}
        <div className={`md:col-span-3 p-3 relative transition-colors flex flex-col justify-start ${
          isActive ? 'bg-blue-50/5' : 'bg-white'
        }`}>
          {/* Quick Shortcuts for Caption and SFX */}
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100/75 select-none shrink-0">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Inserção</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertCaptionOrSfx('LEGENDA:');
                }}
                className="px-2 py-0.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 text-slate-600 hover:text-indigo-700 font-bold rounded-md text-[9px] uppercase transition-all shadow-2xs hover:shadow-3xs cursor-pointer"
                title="Inserir marcador de LEGENDA"
              >
                + Legenda
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertCaptionOrSfx('SFX:');
                }}
                className="px-2 py-0.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 text-slate-600 hover:text-emerald-700 font-bold rounded-md text-[9px] uppercase transition-all shadow-2xs hover:shadow-3xs cursor-pointer"
                title="Inserir marcador de SFX"
              >
                + SFX
              </button>
            </div>
          </div>

          <textarea
            ref={captionRef}
            value={panel.captions}
            onChange={(e) => onUpdate('captions', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'captions')}
            onFocus={onFocus}
            placeholder="LEGENDA:\nEx: 'E ali ele esperou...'\n\nSFX:\nEx: 'BOOM!'"
            className="w-full text-zinc-800 text-[13px] leading-relaxed bg-transparent border-0 outline-none resize-none focus:ring-0 placeholder:text-zinc-350 font-mono min-h-[110px] flex-1"
            id={`caption-${panel.id}`}
          />
          {panel.captions === '' ? (
            <div className="absolute bottom-2 right-2 text-[9px] text-zinc-300 pointer-events-none select-none font-mono">
              [Legendas / SFX]
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onImproveField?.('captions', panel.captions);
              }}
              className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded flex items-center gap-1 text-[9px] font-bold text-indigo-700 uppercase transition-all tracking-wider shadow-2xs cursor-pointer z-10 animate-fade-in"
              title="Refinar escrita com IA"
            >
              <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
              <span>Refinar ✨</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
