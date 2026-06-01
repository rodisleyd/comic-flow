import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { Sparkles, Upload, FileText, Download, Check, RefreshCw, AlertCircle, Trash2, ArrowRight } from 'lucide-react';

interface ArgumentoViewProps {
  argument: string;
  onChangeArgument: (text: string) => void;
  pageCount: number;
  onChangePageCount: (count: number) => void;
  beats: { pageNumber: number; description: string }[];
  onChangeBeats: (beats: { pageNumber: number; description: string }[]) => void;
  beatsSummary: string;
  onChangeSummary: (summary: string) => void;
  onApplyBeatsToScript: (beats: { pageNumber: number; description: string }[]) => void;
  triggerAlert: (title: string, message: string) => void;
  triggerConfirm: (params: {
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    variant?: 'danger' | 'info' | 'success';
  }) => void;
}

export function ArgumentoView({
  argument,
  onChangeArgument,
  pageCount,
  onChangePageCount,
  beats,
  onChangeBeats,
  beatsSummary,
  onChangeSummary,
  onApplyBeatsToScript,
  triggerAlert,
  triggerConfirm,
}: ArgumentoViewProps) {
  const [isImprovingArg, setIsImprovingArg] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [isDecoupling, setIsDecoupling] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    original: string;
    improved: string;
    explanation: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Character limit for argument text
  const CHAR_LIMIT = 3000;

  // Handles drag-and-drop actions
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseTxtFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        if (text.length > CHAR_LIMIT) {
          onChangeArgument(text.slice(0, CHAR_LIMIT));
          triggerAlert(
            "Texto Limitado", 
            "O arquivo importado possuía mais de 3.000 caracteres. Ele foi readequado para caber no limite máximo da decupagem."
          );
        } else {
          onChangeArgument(text);
        }
      }
    };
    reader.onerror = () => {
      triggerAlert("Falha na Leitura", "Ocorreu um erro ao processar o seu arquivo .txt.");
    };
    reader.readAsText(file);
  };

  const parsePdfFile = (file: File) => {
    setIsReadingPdf(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) {
        triggerAlert("Leitura Inoperante", "Não foi possível carregar os dados brutos do PDF.");
        setIsReadingPdf(false);
        return;
      }

      try {
        const response = await fetch("/api/pdf/parse", {
          method: "POST",
          headers: {
            "Content-Type": "application/pdf"
          },
          body: buffer
        });

        if (!response.ok) {
          throw new Error("Erro de conversão no servidor.");
        }

        const data = await response.json();
        if (data && typeof data.text === "string") {
          const rawText = data.text.trim();
          if (rawText.length === 0) {
            triggerAlert("Documento Vazio", "A extração foi concluída, mas nenhum caractere de texto legível foi detectado no PDF.");
          } else if (rawText.length > CHAR_LIMIT) {
            onChangeArgument(rawText.slice(0, CHAR_LIMIT));
            triggerAlert(
              "PDF Importado (Truncado)",
              "O conteúdo de texto do PDF foi extraído com sucesso, mas por exceder o limite de decupagem foi readequado a 3.000 caracteres máximo."
            );
          } else {
            onChangeArgument(rawText);
          }
        } else {
          throw new Error("Texto indisponível no documento.");
        }
      } catch (err) {
        console.error("Erro ao converter PDF:", err);
        triggerAlert(
          "Falha ao Converter PDF",
          "Ocorreu um erro ao extrair o texto do seu PDF. Verifique se o arquivo não está corrompido ou protegido por senha."
        );
      } finally {
        setIsReadingPdf(false);
      }
    };

    reader.onerror = () => {
      triggerAlert("Falha na Leitura", "Ocorreu um erro ao ler o seu arquivo PDF.");
      setIsReadingPdf(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImportedFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) {
      parsePdfFile(file);
    } else if (name.endsWith('.txt') || file.type === 'text/plain') {
      parseTxtFile(file);
    } else {
      triggerAlert(
        "Formato Incongruente", 
        "Nossa plataforma aceita nativamente arquivos de Texto (.txt) e documentos PDF (.pdf). Carregue um desses formatos para iniciar."
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImportedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImportedFile(e.target.files[0]);
    }
  };

  // Connects to /api/ai/improve-argument to expand/improve user's literary premise
  const handleImproveArgument = async () => {
    if (!argument.trim()) {
      triggerAlert("Argumento Vazio", "Por favor, digite ou cole um roteiro resumido (argumento) primeiro.");
      return;
    }

    setIsImprovingArg(true);
    try {
      const response = await fetch("/api/ai/improve-argument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ argument }),
      });

      if (!response.ok) {
        throw new Error("Resposta de IA inadequada do servidor.");
      }

      const data = await response.json();
      if (data && data.improved) {
        setAiSuggestion(data);
      } else {
        throw new Error("IA não retornou o formato correto.");
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert("Erro ao Melhorar", "O assistente de IA falhou ao processar sua solicitação. Tente de novo em instantes.");
    } finally {
      setIsImprovingArg(false);
    }
  };

  // Connects to /api/ai/decouple to segment argument page-by-page (Beats)
  const handleDecoupleArgument = async () => {
    if (!argument.trim()) {
      triggerAlert("Sem Argumento", "É necessário ter um argumento de história inserido para fazer a decupagem de páginas.");
      return;
    }

    setIsDecoupling(true);
    try {
      const response = await fetch("/api/ai/decouple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ argument, pageCount }),
      });

      if (!response.ok) {
        throw new Error("Erro ao consultar serviço de decupagem.");
      }

      const data = await response.json();
      if (data && Array.isArray(data.beats)) {
        // Normalize results ensuring they exactly match specified page count
        const processedBeats = Array.from({ length: pageCount }, (_, i) => {
          const pgNum = i + 1;
          const matchedBeat = data.beats.find((b: any) => b.pageNumber === pgNum);
          return {
            pageNumber: pgNum,
            description: matchedBeat ? matchedBeat.description : ""
          };
        });

        onChangeBeats(processedBeats);
        onChangeSummary(data.summary || "Separação de páginas finalizada com base no arco cronológico.");
      } else {
        throw new Error("Resultado inadequado retornado da API.");
      }
    } catch (err: any) {
      console.error(err);
      triggerAlert("Falha na Decupagem", "Falha interna ao segmentar páginas com IA. Experimente reduzir o número de páginas ou tentar novamente.");
    } finally {
      setIsDecoupling(false);
    }
  };

  // Handlers for real-time manual updates on beat text fields
  const handleBeatTextChange = (pageNum: number, text: string) => {
    const updated = [...beats];
    const index = updated.findIndex((b) => b.pageNumber === pageNum);

    if (index !== -1) {
      updated[index] = { ...updated[index], description: text };
    } else {
      updated.push({ pageNumber: pageNum, description: text });
    }

    onChangeBeats(updated.sort((a, b) => a.pageNumber - b.pageNumber));
  };

  // Ensures we have matching elements even if they haven't been decoupled yet
  const getBeatForPage = (pageNum: number) => {
    const found = beats.find((b) => b.pageNumber === pageNum);
    return found ? found.description : "";
  };

  // Exports beats to a formatted PDF using jsPDF
  const handleExportPDF = () => {
    if (beats.length === 0) {
      triggerAlert("Tabela Vazia", "Gere ou escreva alguns beats antes de exportar em PDF!");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Styling Configuration
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text("DECUPAGEM DE HQ — PLANEJAMENTO DE BEATS", 15, 20);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Roteiro Preliminar  |  Total de Páginas: ${pageCount}  |  Gerado em: ${new Date().toLocaleDateString()}`, 15, 26);
      doc.line(15, 29, 195, 29);

      // Beats table print
      let currentY = 40;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("PÁGINA", 15, currentY);
      doc.text("DESCRIÇÃO DETALHADA DO BEAT (CONTEÚDO DRAMÁTICO)", 35, currentY);
      doc.line(15, currentY + 3, 195, currentY + 3);

      currentY += 10;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // Slate-700

      for (let i = 1; i <= pageCount; i++) {
        const beatText = getBeatForPage(i) || "[Nenhum conteúdo planejado ou inserido]";
        const textLines = doc.splitTextToSize(beatText, 155);
        const rowHeight = Math.max(textLines.length * 5 + 6, 12);

        // Check page overflow
        if (currentY + rowHeight > 275) {
          doc.addPage();
          currentY = 20;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text("PÁG", 15, currentY);
          doc.text("DESCRIÇÃO DETALHADA DO BEAT (CONT.)", 35, currentY);
          doc.line(15, currentY + 3, 195, currentY + 3);
          doc.setFont("Helvetica", "normal");
          currentY += 10;
        }

        // Draw Row
        doc.setFont("Helvetica", "bold");
        doc.text(`${i}`, 17, currentY + 4);
        doc.setFont("Helvetica", "normal");

        let textY = currentY + 4;
        textLines.forEach((line: string) => {
          doc.text(line, 35, textY);
          textY += 5;
        });

        doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
        currentY += rowHeight;
      }

      // Add Summary if exists
      if (beatsSummary) {
        if (currentY + 30 > 275) {
          doc.addPage();
          currentY = 20;
        }
        currentY += 10;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text("Análise de Ritmo Editorial (IA):", 15, currentY);
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);

        const summaryLines = doc.splitTextToSize(beatsSummary, 175);
        let summaryY = currentY + 5;
        summaryLines.forEach((line: string) => {
          doc.text(line, 15, summaryY);
          summaryY += 4.5;
        });
      }

      doc.save(`decupagem-beats-hq.pdf`);
    } catch (err) {
      console.error(err);
      triggerAlert("Falha na Exportação", "Ocorreu um erro insperado ao converter seu esquema de páginas em PDF.");
    }
  };

  const handleBuildPagesInScript = () => {
    // Check if we actually have beats filled out
    const actualBeats = Array.from({ length: pageCount }, (_, i) => {
      const pageNum = i + 1;
      return {
        pageNumber: pageNum,
        description: getBeatForPage(pageNum) || `Início da Página ${pageNum}.`
      };
    });

    const isAllEmpty = actualBeats.every(b => !b.description.trim() || b.description.startsWith('Início da Página'));
    if (isAllEmpty) {
      triggerAlert(
        "Beats Requeridos", 
        "Preencha as descrições na tabela ao lado ou use o botão 'Decupar argumento' para deixar a IA formular a estrutura antes de transportá-la."
      );
      return;
    }

    triggerConfirm({
      title: "Transportar Beats para Escrita?",
      message: `Isto irá gerar exatamente ${pageCount} Páginas no seu editor principal, limpando todos os painéis salvos no momento para substituí-los pela estrutura limpa. O primeiro painel de cada página já iniciará contendo o respectivo trecho definido na decupagem. Deseja prosseguir?`,
      confirmText: "Sim, Gerar Roteiro",
      variant: "success",
      onConfirm: () => {
        onApplyBeatsToScript(actualBeats);
      }
    });
  };

  // Safe clear
  const handleClearBeatsAll = () => {
    triggerConfirm({
      title: "Limpar Estruturas?",
      message: "Deseja limpar todo o argumento colado e os beats gerados? Essa ação deletará os dados locais desta aba.",
      confirmText: "Sim, Limpar Tudo",
      variant: "danger",
      onConfirm: () => {
        onChangeArgument("");
        onChangeBeats([]);
        onChangeSummary("");
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* EXPLANATORY HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="z-10 relative max-w-4xl space-y-1">
          <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full select-none">
            Laboratório Criativo do Escritor
          </span>
          <h2 className="text-xl font-bold tracking-tight">Decupagem Sequencial & Estrutura de Beats</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            Insira a premissa literária geral da sua história no campo esquerdo. Use a inteligência artificial para polir a prosa dramática, determine o número total de páginas finais da sua revista em quadrinhos e deixe a IA planejar a segmentação perfeita do enredo (beats sequenciais). Depois, exporte a decupagem em PDF ou transponha-a direto para o editor de texto principal!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN LEFT: ARGUMENT INPUT AREA */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
            
            {/* Header Column Left */}
            <div className="bg-slate-50 border-b border-gray-100 px-4 py-3 flex justify-between items-center select-none">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-700">ARGUMENTO</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors"
                  title="Importar arquivo .txt ou .pdf"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  onChange={handleFileChoose}
                  className="hidden"
                />
                
                {argument.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearBeatsAll}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors"
                    title="Excluir tudo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Drag & Drop Main Work Area with overlay */}
            <div 
              className="relative p-4 flex-1 min-h-[360px] flex flex-col"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              {(isImprovingArg || isReadingPdf) && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col justify-center items-center z-20">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                  <span className="text-xs font-semibold text-slate-700">
                    {isImprovingArg ? "Refinando narrativa com IA..." : "Extraindo textos do documento PDF..."}
                  </span>
                </div>
              )}

              {dragActive && (
                <div className="absolute inset-0 bg-indigo-50/95 border-2 border-dashed border-indigo-400 flex flex-col justify-center items-center z-10 m-2 rounded-lg">
                  <Upload className="w-10 h-10 text-indigo-600 mb-2 animate-bounce" />
                  <span className="text-sm font-bold text-indigo-800">Solte o arquivo (.txt ou .pdf)</span>
                  <span className="text-[10px] text-indigo-600 mt-1">Carregará o argumento automaticamente</span>
                </div>
              )}

              <textarea
                value={argument}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length <= CHAR_LIMIT) {
                    onChangeArgument(val);
                  }
                }}
                placeholder="Insira aqui o argumento, sinopse detalhada ou um resumo corrido de como a história deve começar, avançar e terminar... (Nossos algoritmos suportam até 3000 caracteres)"
                className="w-full h-full min-h-[300px] text-[13px] leading-relaxed text-slate-800 bg-transparent border-0 outline-none resize-none focus:ring-0 placeholder:text-slate-400 font-sans"
              />

              {argument.trim().length === 0 && (
                <div className="absolute inset-x-8 top-[38%] text-center pointer-events-none select-none">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-[11px] text-slate-450 font-medium font-sans">
                    Arraste um arquivo <strong className="text-indigo-600 font-bold">.txt</strong> ou <strong className="text-indigo-600 font-bold">.pdf</strong> de roteiro ou digite sua sinopse.
                  </p>
                </div>
              )}

              {/* Character Indicator & Improve Trigger */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100 select-none">
                <span className={`text-[10px] font-mono font-medium ${
                  argument.length > CHAR_LIMIT * 0.9 ? 'text-amber-600 font-bold' : 'text-slate-400'
                }`}>
                  {argument.length} / {CHAR_LIMIT} caracteres
                </span>

                <button
                  type="button"
                  onClick={handleImproveArgument}
                  disabled={!argument.trim() || isImprovingArg}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-100 border border-sky-600/15 disabled:border-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-lg shadow-2xs hover:shadow-1xs disabled:shadow-none transition-all cursor-pointer"
                  style={{ backgroundColor: argument.trim() ? '#0284c7' : '' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Melhorar com IA</span>
                </button>
              </div>
            </div>
          </div>

          {/* LOWER CONTROLLERS: NUM SPAGES & DECOUPLE */}
          <div className="bg-slate-100 border border-slate-250 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="flex items-center gap-3 select-none shrink-0 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-xs font-bold text-slate-705">Número de páginas:</span>
              <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onChangePageCount(Math.max(1, pageCount - 1))}
                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all cursor-pointer text-sm font-extrabold select-none"
                  title="Diminuir"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={pageCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      if (val < 1) onChangePageCount(1);
                      else if (val > 120) onChangePageCount(120);
                      else onChangePageCount(val);
                    } else if (e.target.value === '') {
                      // Allow typing blank temporarily, defaults to 1 or keeps typed value
                      onChangePageCount(0);
                    }
                  }}
                  onBlur={() => {
                    if (pageCount < 1) {
                      onChangePageCount(1);
                    }
                  }}
                  className="w-12 text-center text-slate-900 text-xs font-bold focus:outline-none border-0 p-0 focus:ring-0 font-mono focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => onChangePageCount(Math.min(120, pageCount + 1))}
                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all cursor-pointer text-sm font-extrabold select-none"
                  title="Aumentar"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDecoupleArgument}
              disabled={!argument.trim() || isDecoupling}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-700 hover:bg-slate-850 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-lg shadow-sm font-sans transition-all cursor-pointer"
              style={{ backgroundColor: argument.trim() ? '#334155' : '' }}
            >
              {isDecoupling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Decupando com IA...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Decupar argumento</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* COLUMN RIGHT: BEAT / PAGINATED RESULTS SHEET */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col min-h-[464px]">
            
            {/* Table Headers */}
            <div className="bg-slate-200 text-[10px] font-bold text-slate-600 uppercase grid grid-cols-12 select-none px-4 py-3 sticky top-0 z-10 border-b border-slate-300">
              <div className="col-span-1 text-center font-mono text-red-600">PG</div>
              <div className="col-span-11 pl-4 tracking-wider">DESCRIÇÃO DE CADA PÁGINA (BEATS)</div>
            </div>

            {/* Scrollable grid list of N beats */}
            <div className="divide-y divide-gray-150 overflow-y-auto max-h-[440px] flex-1 relative bg-slate-50/30">
              {isDecoupling && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col justify-center items-center z-10">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3 shadow-md">
                    <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span className="text-xs font-bold text-indigo-950">Inteligência Artificial decupando seu roteiro em páginas...</span>
                  </div>
                </div>
              )}

              {Array.from({ length: pageCount }).map((_, idx) => {
                const pageNum = idx + 1;
                const textVal = getBeatForPage(pageNum);

                return (
                  <div key={pageNum} className="grid grid-cols-12 py-3 px-4 hover:bg-slate-100/50 transition-colors items-start">
                    
                    {/* PG Number column */}
                    <div className="col-span-1 flex justify-center pt-1.5 select-none">
                      <span className="bg-red-600 text-white font-mono text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded shadow-2xs">
                        {pageNum}
                      </span>
                    </div>

                    {/* Description Textarea Field Column */}
                    <div className="col-span-11 pl-4">
                      <textarea
                        value={textVal}
                        onChange={(e) => handleBeatTextChange(pageNum, e.target.value)}
                        placeholder={`Diga o que acontece especificamente na Página ${pageNum}... (Arco da história, cenário, introduções ou ações marcantes)`}
                        className="w-full text-slate-850 text-xs font-sans leading-relaxed bg-transparent border-0 focus:bg-white focus:ring-1 focus:ring-indigo-150 rounded px-2.5 py-1.5 outline-none resize-none min-h-[64px] border-b border-transparent placeholder:text-slate-350"
                      />
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pacing Narrative summary from IA */}
            {beatsSummary && !isDecoupling && (
              <div className="p-3 bg-indigo-50/40 border-t border-indigo-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">Ritmo sugerido pela IA:</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans">{beatsSummary}</p>
                </div>
              </div>
            )}

            {/* BOTTOM LOWER BAR: EXPORTS AND ACTION HOOKS */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              
              <button
                type="button"
                onClick={handleBuildPagesInScript}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-slate-200 hover:bg-indigo-50 border border-slate-300 hover:border-indigo-200 text-slate-700 hover:text-indigo-800 text-xs font-bold rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <span>Criar Páginas</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-emerald-700/10 hover:shadow-md cursor-pointer"
                style={{ backgroundColor: '#10b981' }}
              >
                <Download className="w-4 h-4" />
                <span>Salvar em PDF</span>
              </button>

            </div>
          </div>
        </div>

      </div>

      {/* SIDE-BY-SIDE MODAL FOR ARGUMENT SUGGESTIONS */}
      {aiSuggestion && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200"
          >
            {/* Header Modal */}
            <div className="bg-slate-950 text-white p-4 flex justify-between items-center select-none">
              <div className="flex items-center gap-2">
                <Sparkles className="text-sky-400 w-5 h-5 animate-pulse" />
                <h3 className="font-bold text-sm tracking-tight">Sugestão de Polimento de Argumento — Editorial IA</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Revisão Sênior Ativa</span>
            </div>

            {/* Side-by-Side Contents scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Original side box */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 select-none">
                    <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Seu Texto Original</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 text-slate-650 text-xs rounded-lg p-3.5 leading-relaxed font-sans min-h-[180px] select-all">
                    {aiSuggestion.original}
                  </div>
                </div>

                {/* Improved side box */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between select-none">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">Sugestão com IA</span>
                    </div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-mono font-bold px-1.5 py-0.5 rounded border border-indigo-100">Polido</span>
                  </div>
                  <div className="bg-indigo-50/15 border border-indigo-250 text-slate-850 text-xs rounded-lg p-3.5 leading-relaxed font-sans min-h-[180px] select-all">
                    {aiSuggestion.improved}
                  </div>
                </div>

              </div>

              {/* Explanatory banner */}
              {aiSuggestion.explanation && (
                <div className="p-4 bg-slate-50 border border-gray-200 rounded-lg space-y-1">
                  <span className="text-[10px] font-mono font-bold text-sky-700 uppercase tracking-wider block">Por que melhorar? Análise Crítica:</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-sans italic">"{aiSuggestion.explanation}"</p>
                </div>
              )}

            </div>

            {/* Footer Modal Options */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3 justify-end select-none">
              <button
                type="button"
                onClick={() => setAiSuggestion(null)}
                className="px-4 py-2 border border-slate-300 font-bold hover:bg-slate-100 text-slate-600 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Manter Original
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeArgument(aiSuggestion.improved);
                  setAiSuggestion(null);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm font-sans transition-all flex items-center gap-1 cursor-pointer"
                style={{ backgroundColor: '#4f46e5' }}
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Sugestão</span>
              </button>
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
}
