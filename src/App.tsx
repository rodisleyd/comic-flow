import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ComicScript, Page, Panel } from './types.ts';
import { initialScript } from './initialData.ts';
import { ScriptHeader } from './components/ScriptHeader.tsx';
import { PanelRow } from './components/PanelRow.tsx';
import { TraditionalPreview } from './components/TraditionalPreview.tsx';
import { ArgumentoView } from './components/ArgumentoView.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { Eye, BookOpen, AlertCircle, HelpCircle, ChevronRight, Plus, Trash2, Sparkles, Check, Copy, RotateCcw, Loader2, FileText, Focus } from 'lucide-react';

export default function App() {
  /* =========================================================================
   * GESTÃO DE ESTADO (STATE MANAGEMENT) & SINCRONIZAÇÃO DAS COLUNAS
   * =========================================================================
   * O estado 'script' armazena recursivamente o título do roteiro, autor e
   * uma lista de páginas. Cada página possui uma lista de 'panels' (painéis).
   * 
   * SINCRONIZAÇÃO FÍSICA E DE LEITURA:
   * Em vez de usar 3 colunas independentes roláveis que facilmente sofrem de
   * desalinhamento e 'drift' visual, esta arquitetura agrupa os campos de
   * 'Ação', 'Diálogo' e 'Legendas' dentro de um mesmo objeto lógico `Panel` 
   * renderizado horizontalmente na mesma linha do Grid (PanelRow). Dessa forma, 
   * o alinhamento horizontal do painel 1 sempre permanecerá perfeitamente 
   * sincronizado por padrão do mecanismo CSS Grid, independentemente do 
   * tamanho físico ou volume de texto inserido em cada coluna.
   * 
   * PERSISTÊNCIA DURÁVEL (LocalStorage):
   * O estado do roteiro é persistido de forma transparente no navegador do 
   * usuário sempre que ocorrem alterações.
   * ========================================================================= */
  // Lista com todos os roteiros
  const [scripts, setScripts] = useState<ComicScript[]>(() => {
    const savedList = localStorage.getItem('hq_scripts_list');
    if (savedList) {
      try {
        return JSON.parse(savedList);
      } catch (e) {
        console.error("Falha ao recuperar lista de roteiros.", e);
      }
    }
    
    // Migração: se houver um único roteiro salvo anteriormente
    const singleSaved = localStorage.getItem('hq_script_data');
    if (singleSaved) {
      try {
        const parsedSingle = JSON.parse(singleSaved);
        if (parsedSingle && parsedSingle.id) {
          return [parsedSingle];
        }
      } catch (e) {
        console.error("Falha na migração do roteiro antigo.", e);
      }
    }
    
    return [initialScript];
  });

  // ID do roteiro ativo. Se null, o Dashboard é exibido.
  const [activeScriptId, setActiveScriptId] = useState<string | null>(() => {
    const savedActiveId = localStorage.getItem('hq_active_script_id');
    if (savedActiveId && savedActiveId !== 'null') {
      return savedActiveId;
    }
    
    // Se migramos o roteiro único, definimos ele como ativo
    const singleSaved = localStorage.getItem('hq_script_data');
    if (singleSaved) {
      try {
        const parsedSingle = JSON.parse(singleSaved);
        if (parsedSingle && parsedSingle.id) {
          return parsedSingle.id;
        }
      } catch {}
    }
    
    return null;
  });

  // Ref para evitar stale closures ao alternar o roteiro ativo
  const activeScriptIdRef = useRef<string | null>(activeScriptId);
  useEffect(() => {
    activeScriptIdRef.current = activeScriptId;
  }, [activeScriptId]);

  // Roteiro ativo derivado
  const script = useMemo(() => {
    return scripts.find(s => s.id === activeScriptId) || scripts[0] || initialScript;
  }, [scripts, activeScriptId]);

  // Função setScript compatível que atualiza o roteiro ativo na lista
  const setScript = useCallback((update: ComicScript | ((prev: ComicScript) => ComicScript)) => {
    setScripts(prevScripts => {
      const currentActiveId = activeScriptIdRef.current;
      return prevScripts.map(s => {
        if (s.id !== currentActiveId) return s;
        const nextScript = typeof update === 'function' ? update(s) : update;
        return {
          ...nextScript,
          id: s.id // Garante estabilidade de ID
        };
      });
    });
  }, []);

  // Estado que controla a tab ativa (Editor de 3 colunas vs Visualização de Texto Screenplay vs Argumento & Decupagem)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'argumento'>('editor');

  // Estado para exibir dicas de formatação rápida na barra lateral
  const [showTips, setShowTips] = useState<boolean>(true);
  // Estado para controlar o Modo Foco (oculta os painéis laterais de distração)
  const [focusMode, setFocusMode] = useState<boolean>(() => {
    return localStorage.getItem('hq_focus_mode') === 'true';
  });
  // Estado para rastrear o painel ativo em foco para estilização refinada no padrão Geometric Balance
  const [activePanelId, setActivePanelId] = useState<string | null>(null);

  // Estados do Assistente de IA
  const [aiSelection, setAiSelection] = useState<{
    pageId: string;
    panelId: string;
    field: 'action' | 'dialogues' | 'captions';
    originalValue: string;
    panelNumber: number;
    pageNumber: number;
  } | null>(null);

  const [aiResult, setAiResult] = useState<{
    suggestion: string;
    explanation: string;
  } | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'tips' | 'ai'>('tips');
  
  const [copied, setCopied] = useState(false);
  const handleCopyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Estados para Drag & Drop (Arrastar e Soltar) de Páginas e Painéis
  const [draggingPageId, setDraggingPageId] = useState<string | null>(null);
  const [draggingPanel, setDraggingPanel] = useState<{ pageId: string; panelId: string } | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);
  const [dragOverPanelId, setDragOverPanelId] = useState<string | null>(null);

  // Estados para controle de Diálogos Customizados (Iframe/Sandbox Safe)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    variant: 'danger' | 'info' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    onConfirm: () => {},
    variant: 'info'
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: ''
  });

  // Função utilitária para gerar IDs únicos determinísticos/aleatórios para novas entidades
  const generateId = useCallback(() => Math.random().toString(36).substring(2, 9), []);

  // Triggers para disparar os modais de forma limpa e assíncrona
  const triggerConfirm = useCallback((params: {
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    variant?: 'danger' | 'info' | 'success';
  }) => {
    setConfirmModal({
      isOpen: true,
      title: params.title,
      message: params.message,
      confirmText: params.confirmText,
      cancelText: 'Cancelar',
      onConfirm: () => {
        params.onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      variant: params.variant || 'info'
    });
  }, []);

  const triggerAlert = useCallback((title: string, message: string) => {
    setAlertModal({
      isOpen: true,
      title,
      message
    });
  }, []);

  // Handlers para o Assistente de IA
  const handleTriggerAiImprove = useCallback(async (
    pageId: string,
    panelId: string,
    field: 'action' | 'dialogues' | 'captions',
    value: string
  ) => {
    // Encuentra números de página y panel correspondientes
    const pageObj = script.pages.find(p => p.id === pageId);
    if (!pageObj) return;
    const panelObj = pageObj.panels.find(p => p.id === panelId);
    if (!panelObj) return;

    setAiSelection({
      pageId,
      panelId,
      field,
      originalValue: value,
      panelNumber: panelObj.number,
      pageNumber: pageObj.number
    });

    setAiResult(null);
    setAiError(null);
    setAiLoading(true);

    // Abre el panel lateral y cambia el tab para el asistente
    setShowTips(true);
    setSidebarTab('ai');

    try {
      const response = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          content: value,
          scriptContext: {
            title: script.title,
            description: script.description
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro obtido do servidor de IA.");
      }

      const data = await response.json();
      setAiResult({
        suggestion: data.suggestion,
        explanation: data.explanation
      });
    } catch (err: any) {
      console.error("Erro ao aprimorar texto:", err);
      setAiError(err.message || "Não foi possível conectar ao Assistente de IA.");
    } finally {
      setAiLoading(false);
    }
  }, [script.title, script.description, script.pages]);

  const handleApplyAiSuggestion = useCallback(() => {
    if (!aiSelection || !aiResult) return;

    setScript(prev => {
      const updatedPages = prev.pages.map(page => {
        if (page.id !== aiSelection.pageId) return page;

        const updatedPanels = page.panels.map(panel => {
          if (panel.id !== aiSelection.panelId) return panel;

          return {
            ...panel,
            [aiSelection.field]: aiResult.suggestion
          };
        });

        return {
          ...page,
          panels: updatedPanels
        };
      });

      return {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
    });

    triggerConfirm({
      title: "Sugestão Aplicada!",
      message: `A sugestão de IA do Painel ${aiSelection.panelNumber} foi inserida com sucesso no seu roteiro.`,
      confirmText: "Excelente!",
      onConfirm: () => {},
      variant: 'success'
    });

    // Limpa estado da IA e volta para aba de reflexões guias
    setAiSelection(null);
    setAiResult(null);
    setSidebarTab('tips');
  }, [aiSelection, aiResult, triggerConfirm]);

  // Sincroniza as alterações de estado no LocalStorage
  useEffect(() => {
    localStorage.setItem('hq_scripts_list', JSON.stringify(scripts));
  }, [scripts]);

  useEffect(() => {
    localStorage.setItem('hq_active_script_id', activeScriptId || 'null');
  }, [activeScriptId]);

  useEffect(() => {
    if (activeScriptId) {
      localStorage.setItem('hq_script_data', JSON.stringify(script));
    }
  }, [script, activeScriptId]);

  useEffect(() => {
    localStorage.setItem('hq_focus_mode', focusMode ? 'true' : 'false');
  }, [focusMode]);

  // Obter todos os nomes de personagens cadastrados no roteiro em tempo real (algoritmo inteligente estilo Final Draft)
  const characterNames = useMemo(() => {
    const characters = new Set<string>();
    script.pages.forEach(page => {
      page.panels.forEach(panel => {
        if (!panel.dialogues) return;
        const lines = panel.dialogues.split('\n');
        lines.forEach(line => {
          const trimmed = line.trim();
          const hasLetters = /[A-Z]/.test(trimmed);
          const hasPunctuation = /[.,\/#!$%\^&\*;:{}=\-_`~()?"«»]/.test(trimmed);
          
          if (
            trimmed === trimmed.toUpperCase() &&
            trimmed.length >= 2 &&
            trimmed.length <= 25 &&
            hasLetters &&
            !hasPunctuation &&
            isNaN(Number(trimmed)) &&
            !['SFX', 'LEGENDA', 'EFEITO', 'PAINEL', 'PÁGINA', 'PAG', 'PG', 'INT', 'EXT', 'BG'].includes(trimmed)
          ) {
            characters.add(trimmed);
          }
        });
      });
    });
    return Array.from(characters).sort();
  }, [script]);

  // Transpõe a estrutura de Beats planejada para o roteiro principal de escrita
  const handleApplyBeatsToScript = useCallback((
    appBeats: { pageNumber: number; description: string }[]
  ) => {
    const newPages = appBeats.map((b) => {
      const pageId = `page-${generateId()}`;
      const panelId = `panel-${generateId()}`;
      return {
        id: pageId,
        number: b.pageNumber,
        panels: [
          {
            id: panelId,
            number: 1,
            action: b.description || `Início da Página ${b.pageNumber}.`,
            dialogues: "",
            captions: ""
          }
        ]
      } as Page;
    });

    setScript(prev => ({
      ...prev,
      pages: newPages,
      updatedAt: new Date().toISOString()
    }));

    // Retorna para a aba do editor principal de 3 colunas
    setActiveTab('editor');

    // Despara o alert customizado seguro
    triggerAlert(
      "Estrutura Pronta!",
      `Suas ${appBeats.length} páginas foram geradas com sucesso! O primeiro painel de cada página foi inicializado com a decupagem correspondente.`
    );
  }, [generateId, triggerAlert]);

  // Redefinir para o roteiro demonstrativo original
  const handleReset = useCallback(() => {
    triggerConfirm({
      title: "Recomeçar Roteiro Modelo",
      message: "Deseja redefinir o roteiro atual para o roteiro modelo? Todas as suas alterações locais serão sobrepostas e perdidas.",
      confirmText: "Sim, Carregar Modelo",
      variant: "danger",
      onConfirm: () => {
        setScript(initialScript);
      }
    });
  }, [triggerConfirm]);

  // Atualizar metadados globais (Título, Autor, Descrição, Tratamento)
  const handleUpdateMetadata = useCallback((key: 'title' | 'author' | 'description' | 'treatment', value: string) => {
    setScript(prev => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString()
    }));
  }, []);

  // Callbacks de Navegação e Edição do Dashboard
  const handleSelectScript = useCallback((id: string) => {
    setActiveScriptId(id);
  }, []);

  const handleCreateNewScriptFromDashboard = useCallback(() => {
    const newId = `script-${generateId()}`;
    const newBlank: ComicScript = {
      id: newId,
      title: "Novo Roteiro de HQ",
      author: "Roteirista",
      treatment: "1º Tratamento",
      description: "Uma breve descrição ou sinopse da cena...",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: [
        {
          id: `page-${generateId()}`,
          number: 1,
          panels: [
            {
              id: `panel-${generateId()}`,
              number: 1,
              action: "**ENQUADRAMENTO:** Plano Geral - Dia. Descreva a ação visual e enquadramento aqui...",
              dialogues: "PERSONAGEM 1\nDigite o diálogo aqui...",
              captions: "LEGENDA:\nLocalização ou efeito."
            }
          ]
        }
      ]
    };
    setScripts(prev => [...prev, newBlank]);
    setActiveScriptId(newId);
  }, [generateId]);

  const handleDeleteScript = useCallback((id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const targetScript = scripts.find(s => s.id === id);
    const title = targetScript ? targetScript.title : "este roteiro";
    
    triggerConfirm({
      title: "Excluir Roteiro",
      message: `Tem certeza que deseja excluir permanentemente "${title}"? Esta ação não poderá ser desfeita.`,
      confirmText: "Sim, Excluir",
      variant: "danger",
      onConfirm: () => {
        setScripts(prev => {
          const filtered = prev.filter(s => s.id !== id);
          if (filtered.length === 0) {
            return [initialScript];
          }
          return filtered;
        });
        if (activeScriptId === id) {
          setActiveScriptId(null);
        }
      }
    });
  }, [scripts, activeScriptId, triggerConfirm]);

  // Criar um roteiro totalmente novo e em branco
  const handleCreateNewBlank = useCallback(() => {
    triggerConfirm({
      title: "Criar Novo Roteiro",
      message: "Deseja criar um novo roteiro em branco? Você poderá alternar entre seus roteiros a qualquer momento.",
      confirmText: "Sim, Criar Novo",
      variant: "success",
      onConfirm: () => {
        const newId = `script-${generateId()}`;
        const newBlank: ComicScript = {
          id: newId,
          title: "Novo Roteiro de HQ",
          author: "Roteirista",
          treatment: "1º Tratamento",
          description: "Uma breve descrição ou sinopse da cena...",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pages: [
            {
              id: `page-${generateId()}`,
              number: 1,
              panels: [
                {
                  id: `panel-${generateId()}`,
                  number: 1,
                  action: "**ENQUADRAMENTO:** Plano Geral - Dia. Descreva a ação visual e enquadramento aqui...",
                  dialogues: "PERSONAGEM 1\nDigite o diálogo aqui...",
                  captions: "LEGENDA:\nLocalização ou efeito."
                }
              ]
            }
          ]
        };
        setScripts(prev => [...prev, newBlank]);
        setActiveScriptId(newId);
      }
    });
  }, [triggerConfirm, generateId]);

  // Atualizar o conteúdo textual de uma coluna específica em determinado painel
  const handleUpdatePanelField = useCallback((
    pageId: string,
    panelId: string,
    field: keyof Omit<Panel, 'id' | 'number'>,
    value: string
  ) => {
    setScript(prev => {
      const updatedPages = prev.pages.map(page => {
        if (page.id !== pageId) return page;
        
        return {
          ...page,
          panels: page.panels.map(panel => {
            if (panel.id !== panelId) return panel;
            return { ...panel, [field]: value };
          })
        };
      });

      return {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  // Inserir uma nova página vazia em determinada posição (índice)
  const handleInsertPage = useCallback((insertIndex?: number) => {
    setScript(prev => {
      const newPage: Page = {
        id: `page-${generateId()}`,
        number: 0, // será recalculado sequencialmente
        panels: [
          {
            id: `panel-${generateId()}`,
            number: 1,
            action: "",
            dialogues: "",
            captions: ""
          }
        ]
      };
      
      const updatedPages = [...prev.pages];
      const targetIndex = insertIndex !== undefined ? insertIndex : updatedPages.length;
      updatedPages.splice(targetIndex, 0, newPage);
      
      // Reordenar os números de páginas sequencialmente
      const reorderedPages = updatedPages.map((p, idx) => ({
        ...p,
        number: idx + 1
      }));
      
      return {
        ...prev,
        pages: reorderedPages,
        updatedAt: new Date().toISOString()
      };
    });
  }, [generateId]);

  // Adicionar uma nova página vazia no fim do roteiro
  const handleAddPage = useCallback(() => {
    handleInsertPage();
  }, [handleInsertPage]);

  // Excluir uma página inteira
  const handleDeletePage = useCallback((pageId: string) => {
    if (script.pages.length <= 1) {
      triggerAlert("Ação Inválida", "O roteiro deve possuir pelo menos uma página.");
      return;
    }
    
    triggerConfirm({
      title: "Deletar Página Inteira",
      message: "Tem certeza que deseja deletar esta página inteira e todos os seus painéis sincronizados? Esta ação não pode ser desfeita.",
      confirmText: "Sim, Deletar Página",
      variant: "danger",
      onConfirm: () => {
        setScript(prev => {
          if (prev.pages.length <= 1) return prev;
          const filteredPages = prev.pages.filter(p => p.id !== pageId);
          // Reordenar os números de páginas sequencialmente
          const reorderedPages = filteredPages.map((p, idx) => ({
            ...p,
            number: idx + 1
          }));

          return {
            ...prev,
            pages: reorderedPages,
            updatedAt: new Date().toISOString()
          };
        });
      }
    });
  }, [script.pages.length, triggerConfirm, triggerAlert]);

  // Adicionar um novo painel (Panel) em uma página
  const handleInsertPanel = useCallback((
    pageId: string,
    insertIndex: number // índice onde o painel será inserido
  ) => {
    setScript(prev => {
      const updatedPages = prev.pages.map(page => {
        if (page.id !== pageId) return page;
        
        const newPanel: Panel = {
          id: `panel-${generateId()}`,
          number: 0, // será recalculado
          action: "",
          dialogues: "",
          captions: ""
        };

        const updatedPanels = [...page.panels];
        updatedPanels.splice(insertIndex, 0, newPanel);

        // Recalcular numeração sequencial dos painéis dentro desta página
        const reorderedPanels = updatedPanels.map((p, idx) => ({
          ...p,
          number: idx + 1
        }));

        return {
          ...page,
          panels: reorderedPanels
        };
      });

      return {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  // Deletar um painel específico de uma página
  const handleDeletePanel = useCallback((pageId: string, panelId: string) => {
    const page = script.pages.find(p => p.id === pageId);
    if (page && page.panels.length <= 1) {
      triggerAlert("Ação Rejeitada", "A página deve conter pelo menos um painel. Adicione outro antes de remover este.");
      return;
    }

    setScript(prev => {
      const updatedPages = prev.pages.map(page => {
        if (page.id !== pageId) return page;
        
        if (page.panels.length <= 1) {
          return page;
        }

        const filteredPanels = page.panels.filter(p => p.id !== panelId);
        // Recalcular numeração contínua
        const reorderedPanels = filteredPanels.map((p, idx) => ({
          ...p,
          number: idx + 1
        }));

        return {
          ...page,
          panels: reorderedPanels
        };
      });

      return {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
    });
  }, [script.pages, triggerAlert]);

  // Mudar posição do painel (Mover para Cima ou Baixo)
  const handleMovePanel = useCallback((pageId: string, panelIndex: number, direction: 'up' | 'down') => {
    setScript(prev => {
      const updatedPages = prev.pages.map(page => {
        if (page.id !== pageId) return page;

        const updatedPanels = [...page.panels];
        const targetIndex = direction === 'up' ? panelIndex - 1 : panelIndex + 1;

        if (targetIndex < 0 || targetIndex >= updatedPanels.length) return page;

        // Efetua o Swap (troca dos itens do vetor de estado)
        const temp = updatedPanels[panelIndex];
        updatedPanels[panelIndex] = updatedPanels[targetIndex];
        updatedPanels[targetIndex] = temp;

        // Atualizar os números sequenciais de cada painel após o swap
        const reorderedPanels = updatedPanels.map((p, idx) => ({
          ...p,
          number: idx + 1
        }));

        return {
          ...page,
          panels: reorderedPanels
        };
      });

      return {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  // Auxiliares para reorganização Drag & Drop
  const handleReorderPages = useCallback((sourcePageId: string, targetPageId: string) => {
    setScript(prev => {
      const sourceIdx = prev.pages.findIndex(p => p.id === sourcePageId);
      const targetIdx = prev.pages.findIndex(p => p.id === targetPageId);
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      const updatedPages = [...prev.pages];
      const [removed] = updatedPages.splice(sourceIdx, 1);
      updatedPages.splice(targetIdx, 0, removed);

      // Re-indexar páginas sequencialmente
      const reindexed = updatedPages.map((p, idx) => ({ ...p, number: idx + 1 }));

      return {
        ...prev,
        pages: reindexed,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const handleReorderPanels = useCallback((
    sourcePageId: string, 
    sourcePanelId: string, 
    targetPageId: string, 
    targetPanelId: string | null
  ) => {
    setScript(prev => {
      const sourcePage = prev.pages.find(p => p.id === sourcePageId);
      if (!sourcePage) return prev;
      const sourcePanelIdx = sourcePage.panels.findIndex(p => p.id === sourcePanelId);
      if (sourcePanelIdx === -1) return prev;
      const sourcePanel = sourcePage.panels[sourcePanelIdx];

      // Rejeita mover se for o único painel em outra página
      if (sourcePageId !== targetPageId && sourcePage.panels.length <= 1) {
        triggerAlert("Ação Rejeitada", "Cada página deve conter pelo menos um painel para não ficar vazia.");
        return prev;
      }

      // Copiar páginas profundamente
      let updatedPages = prev.pages.map(p => ({
        ...p,
        panels: [...p.panels]
      }));

      const sPageCloneIdx = updatedPages.findIndex(p => p.id === sourcePageId);
      const tPageCloneIdx = updatedPages.findIndex(p => p.id === targetPageId);
      if (sPageCloneIdx === -1 || tPageCloneIdx === -1) return prev;

      const sPageClone = updatedPages[sPageCloneIdx];
      const tPageClone = updatedPages[tPageCloneIdx];

      // Remover do local de origem
      sPageClone.panels.splice(sourcePanelIdx, 1);

      // Descobrir index de destino
      let tPanelIdx = tPageClone.panels.length; // Insere no final se targetPanelId for nulo
      if (targetPanelId) {
        const idx = tPageClone.panels.findIndex(p => p.id === targetPanelId);
        if (idx !== -1) {
          tPanelIdx = idx;
        }
      }

      // Inserir no destino
      tPageClone.panels.splice(tPanelIdx, 0, sourcePanel);

      // Recalcular numeração dos painéis nas páginas atualizadas
      updatedPages = updatedPages.map((page) => ({
        ...page,
        panels: page.panels.map((p, pIdx) => ({
          ...p,
          number: pIdx + 1
        }))
      }));

      return {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
    });
  }, [triggerAlert]);

  // Exportar o arquivo do roteiro completo no formato JSON estruturado
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(script, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${script.title.toLowerCase().replace(/\s+/g, '-')}-esquema-hq.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Importar o arquivo do roteiro de texto JSON
  const handleImportJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      // Validação básica da assinatura do JSON estrutural
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.pages)) {
        setScript({
          id: parsed.id || `script-${generateId()}`,
          title: parsed.title || "Roteiro Importado",
          author: parsed.author || "Autor Desconhecido",
          description: parsed.description || "",
          createdAt: parsed.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pages: parsed.pages
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return (
    <div id="hq-script-app-root" className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      activeScriptId === null ? 'bg-[#0B0F19] text-white' : 'bg-slate-50 text-slate-800'
    }`}>
      {activeScriptId === null ? (
        <Dashboard
          scripts={scripts}
          onSelectScript={handleSelectScript}
          onCreateNewScript={handleCreateNewScriptFromDashboard}
          onDeleteScript={handleDeleteScript}
        />
      ) : (
        <>
          {/* Dynamic Header Component */}
          {!focusMode && (
            <ScriptHeader
              script={script}
              onUpdateMetadata={handleUpdateMetadata}
              onExportJSON={handleExportJSON}
              onImportJSON={handleImportJSON}
              onReset={handleReset}
              onNewScript={handleCreateNewBlank}
              onAddPage={handleAddPage}
              onBackToDashboard={() => setActiveScriptId(null)}
            />
          )}

      {/* Focus Mode Sticky Immersive Header */}
      {focusMode && activeTab === 'editor' && (
        <div className="bg-slate-900 text-white py-2 px-6 flex justify-between items-center shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <span className="flex h-2,5 w-2,5 relative items-center justify-center">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-slate-100 flex items-center gap-1.5">
              <Focus className="w-3.5 h-3.5 text-red-500" />
              MODO FOCO ATIVO
            </span>
            <span className="text-xs text-slate-400 font-medium hidden md:inline-block border-l border-slate-800 pl-3">
              {script.title || "Sem título"} — {script.pages.length} páginas
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddPage()}
              className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-slate-700 hover:border-slate-600 shadow-sm"
              title="Adicionar uma nova página rapidamente"
            >
              <Plus className="w-3.5 h-3.5 text-slate-300" />
              <span>Adicionar Página</span>
            </button>
            <button 
              onClick={() => setFocusMode(false)}
              className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg shadow-md transition-all cursor-pointer flex items-center gap-1.5 border border-red-500 hover:scale-[1.02] active:scale-95"
            >
              <Focus className="w-3.5 h-3.5" />
              <span>Sair do Foco</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Main Canvas Tabs and Navigation Bar */}
      {!focusMode && (
        <div className="bg-white border-b border-gray-200 py-2.5">
          <div className="w-full px-6 flex justify-between items-center">
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200/50">
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'editor'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Matriz 3 Colunas</span>
              </button>
              <button
                onClick={() => setActiveTab('argumento')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'argumento'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                <Sparkles className="w-4 h-4 text-indigo-500 pointer-events-none" />
                <span>Argumento & Decupagem (IA)</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Visualizar Clássico</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'editor' && (
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all relative select-none cursor-pointer ${
                    focusMode
                      ? 'bg-red-600 text-white shadow-xs hover:bg-red-700 animate-pulse'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/50 hover:bg-slate-200/80'
                  }`}
                  title={focusMode ? "Desativar modo foco" : "Ativar modo foco (oculta barras laterais de distração)"}
                >
                  <Focus className="w-4 h-4" />
                  <span>{focusMode ? 'Modo Foco Ativo' : 'Ativar Modo Foco'}</span>
                </button>
              )}

              <button
                onClick={() => setShowTips(!showTips)}
                className={`flex items-center gap-1 text-slate-450 hover:text-indigo-600 transition-colors text-xs font-medium ${
                  focusMode ? 'opacity-30 pointer-events-none cursor-not-allowed' : ''
                }`}
                title="Alternar guia rápido de escrita"
                disabled={focusMode}
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{showTips ? 'Ocultar Guia Coadjutor' : 'Exibir Guia Rápido'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Primary Layout Engine */}
      <div className={`flex-1 w-full gap-6 ${
        focusMode && activeTab === 'editor' 
          ? 'px-4 sm:px-10 py-4 max-w-6xl mx-auto flex flex-col' 
          : 'px-6 py-6 flex flex-col lg:flex-row'
      }`}>
        
        {/* Sidebar: Panel Navigator (Architecture Sychronization / Geometric Balance theme) */}
        {activeTab === 'editor' && !focusMode && (
          <aside className="w-full lg:w-56 shrink-0 bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-4 self-start sticky top-[136px] shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-150 pb-2 flex items-center justify-between">
              <span>Estrutura de Estado</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            
            <div className="space-y-1 overflow-y-auto max-h-[340px] pr-1 scrollbar-thin">
              {script.pages.map((p) => (
                <div key={p.id} className="space-y-1">
                  <div 
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingPageId(p.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingPageId && draggingPageId !== p.id) {
                        setDragOverPageId(p.id);
                      }
                    }}
                    onDragLeave={() => setDragOverPageId(null)}
                    onDragEnd={() => {
                      setDraggingPageId(null);
                      setDragOverPageId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggingPageId && draggingPageId !== p.id) {
                        handleReorderPages(draggingPageId, p.id);
                      } else if (draggingPanel) {
                        handleReorderPanels(draggingPanel.pageId, draggingPanel.panelId, p.id, null);
                      }
                      setDraggingPageId(null);
                      setDraggingPanel(null);
                      setDragOverPageId(null);
                      setDragOverPanelId(null);
                    }}
                    className={`text-[9.5px] font-extrabold uppercase tracking-widest pt-2 px-1 cursor-grab active:cursor-grabbing hover:text-red-700 transition-all flex items-center justify-between select-none ${
                      draggingPageId === p.id ? 'opacity-30' : 'text-red-600'
                    } ${
                      dragOverPageId === p.id && draggingPageId ? 'border-t-2 border-red-500 text-red-600 pt-1' : ''
                    }`}
                  >
                    <span>Página {p.number}</span>
                    <span className="text-[10px] text-slate-350">⋮⋮</span>
                  </div>
                  {p.panels.map((pan) => {
                    const isFocused = activePanelId === pan.id;
                    const truncatedAction = pan.action 
                      ? (pan.action.slice(0, 24) + (pan.action.length > 24 ? '...' : '')) 
                      : `[Painel ${pan.number} Vazio]`;
                    const isDraggingThis = draggingPanel?.panelId === pan.id;
                    const isDragOverThis = dragOverPanelId === pan.id;

                    return (
                      <button
                        key={pan.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingPanel({ pageId: p.id, panelId: pan.id });
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggingPanel && draggingPanel.panelId !== pan.id) {
                            setDragOverPanelId(pan.id);
                          }
                        }}
                        onDragLeave={() => setDragOverPanelId(null)}
                        onDragEnd={() => {
                          setDraggingPanel(null);
                          setDragOverPanelId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingPanel && draggingPanel.panelId !== pan.id) {
                            handleReorderPanels(draggingPanel.pageId, draggingPanel.panelId, p.id, pan.id);
                          }
                          setDraggingPanel(null);
                          setDragOverPanelId(null);
                        }}
                        onClick={() => {
                          const el = document.getElementById(`panel-row-${pan.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setActivePanelId(pan.id);
                        }}
                        className={`w-full text-left p-2 rounded text-[11px] font-medium transition-all flex items-center justify-between group cursor-grab active:cursor-grabbing ${
                          isFocused
                            ? 'bg-blue-50 border-l-2 border-blue-600 text-blue-900 font-semibold shadow-2xs'
                            : 'hover:bg-slate-50 text-slate-600'
                        } ${
                          isDraggingThis ? 'opacity-30 border border-dashed border-slate-300' : ''
                        } ${
                          isDragOverThis && draggingPanel ? 'border-t-2 border-indigo-400 bg-indigo-50/50' : ''
                        }`}
                      >
                        <span className="truncate mr-1 flex items-center gap-1">
                          <span className="text-[10px] text-slate-300 font-sans select-none tracking-tighter">⋮⋮</span>
                          [{pan.number < 10 ? `0${pan.number}` : pan.number}] {truncatedAction}
                        </span>
                        {isFocused && <span className="w-1 h-3 bg-blue-500 rounded-sm shrink-0"></span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 mt-auto">
              <div className="p-3 bg-slate-50 border border-gray-200/60 rounded-lg">
                <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">MÉTRICAS COGNITIVAS</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600">Complexidade Ciclo.</span>
                  <span className="text-[10px] font-bold text-emerald-600">M=4</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[25%]"></div>
                </div>
                <p className="text-[8px] text-slate-400 mt-1.5 leading-tight">Refatoração por acoplamento frouxo e representação lúdica simplificada.</p>
              </div>
            </div>
          </aside>
        )}

        {/* Editor Main Panel Workspace */}
        <div className={`flex-1 space-y-6 transition-all duration-300 ${focusMode && activeTab === 'editor' ? 'max-w-5xl mx-auto w-full' : ''}`}>
          {activeTab === 'editor' ? (
            <div className="space-y-8">
              {/* STICKY COLUMN HEADER INDICATOR */}
              <div className="hidden md:grid grid-cols-12 gap-px bg-slate-200 text-[10px] font-bold tracking-widest text-slate-500 text-center rounded-lg overflow-hidden sticky top-[136px] z-10 shadow-sm">
                <div className="col-span-1 bg-slate-100 py-3 text-slate-400 border-r border-slate-200">ID</div>
                <div className="col-span-4 bg-slate-50 py-3 uppercase text-blue-900">1. Ações Visuais (Cenário / Câmera)</div>
                <div className="col-span-4 bg-slate-50 py-3 uppercase text-emerald-950 border-x border-slate-200 animate-pulse">2. Personagem & Diálogos / Falas</div>
                <div className="col-span-3 bg-slate-50 py-3 uppercase text-indigo-900">3. Legendas e Onomatopeias (SFX)</div>
              </div>

              {script.pages.map((page, pIdx) => (
                <div key={page.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  
                  {/* Page header with deletion, addition, indicators */}
                  <div className="bg-slate-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="bg-red-600 text-white font-mono text-xs font-bold px-2.5 py-1 rounded shadow-2xs">
                        PÁGINA {page.number}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium font-mono">
                        ({page.panels.length} {page.panels.length === 1 ? 'painel registrado' : 'painéis registrados'})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleInsertPanel(page.id, page.panels.length)}
                        className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-2 py-1 rounded transition-colors"
                        title="Adicionar painel nesta página"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Painel</span>
                      </button>

                      {script.pages.length > 1 && (
                        <button
                          onClick={() => handleDeletePage(page.id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 bg-rose-50 px-2 py-1 rounded transition-colors"
                          title="Remover esta página do roteiro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Página</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sychronized grid list of panels inside the page */}
                  <div className="divide-y divide-gray-100">
                    {page.panels.map((panel, panIdx) => (
                      <PanelRow
                        key={panel.id}
                        panel={panel}
                        pageIndex={pIdx}
                        panelIndex={panIdx}
                        isActive={activePanelId === panel.id}
                        onFocus={() => setActivePanelId(panel.id)}
                        characterNames={characterNames}
                        totalPanelsInPage={page.panels.length}
                        onImproveField={(field, val) => handleTriggerAiImprove(page.id, panel.id, field, val)}
                        onUpdate={(field, val) => handleUpdatePanelField(page.id, panel.id, field, val)}
                        onDelete={() => handleDeletePanel(page.id, panel.id)}
                        onMoveUp={() => handleMovePanel(page.id, panIdx, 'up')}
                        onMoveDown={() => handleMovePanel(page.id, panIdx, 'down')}
                        onInsertBefore={() => handleInsertPanel(page.id, panIdx)}
                        onInsertAfter={() => handleInsertPanel(page.id, panIdx + 1)}
                      />
                    ))}
                  </div>

                  {/* Quick helper to append panel or page at the bottom of the page */}
                  <div className="p-3 bg-slate-50/50 border-t border-gray-100 flex justify-center gap-3">
                    <button
                      onClick={() => handleInsertPage(pIdx + 1)}
                      className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold py-1.5 px-4 rounded-md hover:bg-red-50 transition-colors cursor-pointer border border-red-150 bg-white shadow-2xs"
                      title={`Inserir uma nova página após a Página ${page.number}`}
                    >
                      <Plus className="w-4 h-4 text-red-500" />
                      <span>Inserir Página {page.number + 1}</span>
                    </button>

                    <button
                      onClick={() => handleInsertPanel(page.id, page.panels.length)}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold py-1.5 px-4 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer border border-indigo-150 bg-white shadow-2xs"
                    >
                      <Plus className="w-4 h-4 text-indigo-500" />
                      <span>Inserir Painel {page.panels.length + 1}</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add primary page button */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleAddPage}
                  className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-indigo-600 text-sm font-bold rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 transition-all shadow-sm group"
                >
                  <Plus className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span>Cadastrar Nova Página (Pág. {script.pages.length + 1})</span>
                </button>
              </div>
            </div>
          ) : activeTab === 'argumento' ? (
            <ArgumentoView
              argument={script.argument || ''}
              onChangeArgument={(val) => setScript(prev => ({ ...prev, argument: val }))}
              pageCount={script.pageCount || 8}
              onChangePageCount={(val) => setScript(prev => ({ ...prev, pageCount: val }))}
              beats={script.beats || []}
              onChangeBeats={(val) => setScript(prev => ({ ...prev, beats: val }))}
              beatsSummary={script.beatsSummary || ''}
              onChangeSummary={(val) => setScript(prev => ({ ...prev, beatsSummary: val }))}
              onApplyBeatsToScript={handleApplyBeatsToScript}
              triggerAlert={triggerAlert}
              triggerConfirm={triggerConfirm}
            />
          ) : (
            // Formatted traditional view tab
            <TraditionalPreview script={script} />
          )}
        </div>

        {/* Sidebar Help Guide & Instruction System */}
        {showTips && activeTab === 'editor' && !focusMode && (
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            
            {/* Header com Abas da Barra Lateral */}
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200/50">
              <button
                type="button"
                onClick={() => setSidebarTab('tips')}
                className={`flex-1 text-center py-1.5 rounded-md text-[11.5px] font-bold transition-all cursor-pointer ${
                  sidebarTab === 'tips'
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Guia Rápido
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('ai')}
                className={`flex-1 text-center py-1.5 rounded-md text-[11.5px] font-bold transition-all relative cursor-pointer ${
                  sidebarTab === 'ai'
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Assistente IA
                </span>
                {aiSelection && !aiResult && aiLoading && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                )}
              </button>
            </div>

            {sidebarTab === 'tips' ? (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
                    <HelpCircle className="text-indigo-500 w-4.5 h-4.5" />
                    Guia do Quadrinhista Sênior
                  </h3>

                  <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Coluna 1: Ações Visuais
                      </h4>
                      <p className="mt-1 text-slate-500 ml-2.5">
                        Descreva o cenário, enquadramento (plano detalhe, panorâmica) e a movimentação física dos personagens. É o roteiro para o desenhista.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Coluna 2: Personagens e Falas
                      </h4>
                      <p className="mt-1 text-slate-500 ml-2.5">
                        Utilize o nome do personagem em <strong className="text-slate-700">LETRA MAIÚSCULA</strong> seguido de parênteses para intenções de voz e o balão de fala abaixo.
                      </p>
                      <div className="mt-1.5 ml-2.5 p-1.5 bg-slate-50 font-mono text-[10px] text-slate-600 rounded">
                        BATMAN<br/>(suspirando)<br/>A chuva nunca cessa.
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Coluna 3: Legendas e SFX
                      </h4>
                      <p className="mt-1 text-slate-500 ml-2.5">
                        Destinado a recordatórios narrativos (Ex: <strong className="text-slate-700">LEGENDA:</strong> Gotham City.) e onomatopeias bruscas / barulho (Ex: <strong className="text-slate-700">SFX:</strong> CRASH!).
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-3 text-[11px] text-amber-800 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Sincronia Estrita</p>
                      <p className="mt-0.5 text-amber-700/90">
                        O editor alinha as linhas horizontalmente garantindo que a Ação, Falas e SFX do Painel pertençam sempre ao mesmo fluxo de leitura temporal daquela cena.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick formatting cheatsheet */}
                <div className="bg-slate-900 text-slate-300 rounded-xl p-5 shadow-sm border border-slate-800 text-xs">
                  <h3 className="font-bold text-slate-100 flex items-center gap-1.5 mb-2.5">
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                    Dica de Formato de Quadrinhos
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Diferente de roteiros cinematográficos comuns, os quadrinhos são delimitados em páginas estritas de publicação física. Geralmente, uma página ideal possui entre 1 e 6 painéis para manter o dinamismo sem saturar a leitura visual do leitor.
                  </p>
                </div>
              </>
            ) : (
              /* TAB: ASSISTENTE DE IA */
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 animate-fade-in flex flex-col min-h-[400px]">
                <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-1.5 border-b border-gray-100 pb-2.5 shrink-0">
                  <Sparkles className="text-indigo-600 w-4.5 h-4.5 animate-pulse" />
                  Mago Editorial de IA
                </h3>

                {!aiSelection ? (
                  // Empty State for AI
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-500 mb-3 animate-pulse">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pronto para Otimizar</h4>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      Clique no botão <strong className="text-indigo-600 font-bold">Refinar ✨</strong> em qualquer coluna de qualquer painel do roteiro.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      O assistente vai melhorar ritmo, linguagem e corrigir ortografia sem descaracterizar a sua voz original!
                    </p>
                  </div>
                ) : (
                  // Active review mode
                  <div className="space-y-3.5 flex-1 flex flex-col text-xs">
                    {/* Header Details */}
                    <div className="flex justify-between items-center bg-slate-50 rounded-lg p-2.5 border border-slate-100 shadow-3xs shrink-0">
                      <div>
                        <span className="text-[8px] uppercase font-mono font-bold text-indigo-500 tracking-wider">REVISÃO ESTRELA</span>
                        <h4 className="text-[11px] font-bold text-slate-800">
                          Pág. {aiSelection.pageNumber}, Painel {aiSelection.panelNumber}
                        </h4>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[9px] uppercase tracking-wide shrink-0">
                        {aiSelection.field === 'action' ? 'Visual / Ação' : 
                         aiSelection.field === 'dialogues' ? 'Diálogos' : 'Legenda'}
                      </span>
                    </div>

                    {/* Original value reference */}
                    <div className="shrink-0">
                      <span className="text-[9px] uppercase font-mono font-bold text-slate-400 tracking-wider">Texto de Origem</span>
                      <div className="mt-1 p-2 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-500 italic max-h-[80px] overflow-y-auto whitespace-pre-wrap">
                        {aiSelection.originalValue || "[Vazio]"}
                      </div>
                    </div>

                    {/* AI Improvement Section */}
                    <div className="flex-1 flex flex-col min-h-[160px] relative">
                      <span className="text-[9px] uppercase font-mono font-bold text-indigo-600 tracking-wider block mb-1">
                        Proposta de Refinamento
                      </span>

                      {aiLoading && (
                        <div className="absolute inset-0 bg-white/85 backdrop-blur-3xs z-10 flex flex-col items-center justify-center text-center p-4 rounded-lg border border-indigo-150">
                          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                          <p className="text-[11px] font-bold text-slate-700 animate-pulse">Lapidando o Texto...</p>
                          <p className="text-[9px] text-slate-400 max-w-[200px] mt-1.5">
                            Corrigindo ortografia e polindo o ritmo, mantendo fielmente a essência da sua ideia do roteiro.
                          </p>
                        </div>
                      )}

                      {aiError && (
                        <div className="flex-1 bg-red-50/50 border border-red-200/60 rounded-lg p-3 text-[11px] flex flex-col justify-center items-center text-center">
                          <AlertCircle className="w-5 h-5 text-red-500 mb-1.5" />
                          <p className="font-bold text-red-800">Ocorreu um erro</p>
                          <p className="text-red-700/90 text-[10px] mt-0.5 leading-tight">{aiError}</p>
                          <button
                            type="button"
                            onClick={() => handleTriggerAiImprove(aiSelection.pageId, aiSelection.panelId, aiSelection.field, aiSelection.originalValue)}
                            className="mt-3 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded text-[10px] uppercase transition-all tracking-wide shadow-2xs cursor-pointer"
                          >
                            Tentar Novamente
                          </button>
                        </div>
                      )}

                      {!aiLoading && !aiError && aiResult && (
                        <div className="flex-1 flex flex-col space-y-2.5">
                          {/* Editable suggested area */}
                          <div className="flex-1 flex flex-col">
                            <textarea
                              value={aiResult.suggestion}
                              onChange={(e) => setAiResult(prev => prev ? { ...prev, suggestion: e.target.value } : null)}
                              className="w-full h-full min-h-[110px] p-2.5 bg-indigo-55/5 border border-indigo-100 text-slate-800 text-[12px] leading-relaxed rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none font-sans"
                              title="Tire proveito e ajuste a sugestão da IA antes de aplicar"
                            />
                            <p className="text-[8px] text-slate-400 mt-1 text-right italic">
                              💡 Ajuste livremente o texto acima antes de aplicar
                            </p>
                          </div>

                          {/* Mentorship/Explanation box */}
                          <div className="bg-slate-50 border border-slate-155 p-2.5 rounded-lg shrink-0">
                            <div className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 pb-1 border-b border-gray-100 mb-1">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                              O que foi aprimorado:
                            </div>
                            <p className="text-[10px] text-slate-600 leading-normal italic whitespace-pre-wrap">
                              {aiResult.explanation}
                            </p>
                          </div>

                          {/* Operations/Actions Buttons bar */}
                          <div className="grid grid-cols-2 gap-2 pt-1 shrink-0">
                            <button
                              type="button"
                              onClick={handleApplyAiSuggestion}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer text-[11px] uppercase tracking-wider"
                              title="Substituir campo original com o texto otimizado"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Aplicar à HQ</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyText(aiResult.suggestion)}
                              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:border-slate-300 cursor-pointer text-[11px]"
                              title="Copiar texto refinado para área de transferência"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                                  <span className="text-emerald-600 uppercase tracking-wider text-[10px]">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="uppercase tracking-wider text-[10px]">Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Secondary Actions */}
                    {!aiLoading && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-150 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setAiSelection(null);
                            setAiResult(null);
                            setSidebarTab('tips');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-slate-800 rounded bg-slate-50 hover:bg-slate-100 transition-colors uppercase text-[9px] tracking-wider font-semibold cursor-pointer"
                          title="Melhorar outra ou voltar"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Voltar ao Guia</span>
                        </button>

                        {aiSelection && aiResult && (
                          <button
                            type="button"
                            onClick={() => handleTriggerAiImprove(aiSelection.pageId, aiSelection.panelId, aiSelection.field, aiSelection.originalValue)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1 hover:underline cursor-pointer"
                            title="Consultar IA novamente para obter novos refinamentos"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                            <span>Regerar 🎲</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Footer Status Bar with Geometric Balance design */}
      <footer className="h-8 bg-gray-900 text-gray-400 flex items-center justify-between px-6 text-[10px] uppercase tracking-widest shrink-0 font-mono">
        <div className="flex items-center gap-6">
          <span className="text-white font-bold">Matriz 3 Colunas</span>
          <span className="flex items-center gap-1.5">
            Sincronia de Estado: <span className="text-green-500 font-bold">● OK</span>
          </span>
          <span className="hidden sm:inline">Páginas Totais: {script.pages.length}</span>
          <span className="hidden sm:inline">Painéis Totais: {script.pages.reduce((acc, p) => acc + p.panels.length, 0)}</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden md:inline">Refatoração: <span className="text-blue-400 font-semibold">Clean Code Applied</span></span>
          <span className="text-white hidden sm:inline">v1.1.2_M=4</span>
        </div>
      </footer>
        </>
      )}

      {/* Custom Confirmation Modal (Geometric Balance Theme) */}
      {confirmModal.isOpen && (
        <div id="confirm-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div id="confirm-modal-body" className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden transform scale-100 transition-all duration-200">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-full ${
                  confirmModal.variant === 'danger' ? 'bg-red-50 text-red-600' :
                  confirmModal.variant === 'success' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                    {confirmModal.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3.5 flex justify-end gap-2.5 border-t border-slate-100">
              <button
                id="confirm-modal-cancel"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-wide cursor-pointer"
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                id="confirm-modal-action"
                onClick={confirmModal.onConfirm}
                className={`px-3.5 py-1.5 text-xs font-bold text-white rounded-lg transition-all uppercase tracking-wide shadow-sm hover:shadow-md cursor-pointer ${
                  confirmModal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  confirmModal.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal (Geometric Balance Theme) */}
      {alertModal.isOpen && (
        <div id="alert-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div id="alert-modal-body" className="bg-white rounded-xl shadow-xl max-w-sm w-full border border-slate-200 overflow-hidden transform scale-100 transition-all duration-200">
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-full bg-amber-50 text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
                    {alertModal.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    {alertModal.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3.5 flex justify-end border-t border-slate-100">
              <button
                id="alert-modal-ok"
                onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors uppercase tracking-wide cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
