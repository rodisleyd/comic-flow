import React from 'react';
import { ComicScript } from '../types.ts';
import { Copy, Download, FileText, Check } from 'lucide-react';
import { exportScriptToPDF } from '../utils/pdfGenerator.ts';

interface TraditionalPreviewProps {
  script: ComicScript;
}

export const TraditionalPreview: React.FC<TraditionalPreviewProps> = ({ script }) => {
  const [copied, setCopied] = React.useState(false);

  // Generates the traditional vertical script text
  const generateTraditionalText = (): string => {
    let output = `=================================================================\n`;
    output += `ROTEIRO DE HISTÓRIA EM QUADRINHOS (HQ)\n`;
    output += `Sincronizador Especial de 3 Colunas\n`;
    output += `=================================================================\n\n`;
    output += `TÍTULO: ${script.title.toUpperCase()}\n`;
    output += `AUTOR: ${script.author}\n`;
    if (script.description) {
      output += `DESCRIÇÃO: ${script.description}\n`;
    }
    output += `CRIADO EM: ${new Date(script.createdAt).toLocaleDateString('pt-BR')}\n`;
    output += `-----------------------------------------------------------------\n\n`;

    script.pages.forEach((page) => {
      output += `=================================================================\n`;
      output += `PÁGINA ${page.number}\n`;
      output += `=================================================================\n\n`;

      page.panels.forEach((panel) => {
        output += `[PAINEL ${panel.number}]\n\n`;
        
        if (panel.action && panel.action.trim()) {
          output += `AÇÃO:\n  ${panel.action.split('\n').join('\n  ')}\n\n`;
        } else {
          output += `AÇÃO:\n  (Sem descrição visual especificada)\n\n`;
        }

        if (panel.dialogues && panel.dialogues.trim()) {
          output += `DIÁLOGOS E PERSONAGENS:\n`;
          // Format character and dialogues slightly inset like screenplay
          const lines = panel.dialogues.split('\n');
          lines.forEach(line => {
            if (line.trim() === line.trim().toUpperCase() && line.trim().length > 0) {
              output += `  ${line.trim()}\n`;
            } else {
              output += `    ${line}\n`;
            }
          });
          output += `\n`;
        }

        if (panel.captions && panel.captions.trim()) {
          output += `LEGENDAS E EFEITOS (SFX):\n  ${panel.captions.split('\n').join('\n  ')}\n\n`;
        }

        output += `-----------------------------------------------------------------\n\n`;
      });
    });

    return output;
  };

  const handleCopy = () => {
    const text = generateTraditionalText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = generateTraditionalText();
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${script.title.toLowerCase().replace(/\s+/g, '-')}-roteiro-tradicional.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const traditionalText = generateTraditionalText();

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-6 shadow-xl border border-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-slate-800 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Visualização de Roteiro Tradicional
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Convertido automaticamente a partir da matriz lógica de 3 colunas.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 transition-colors text-xs font-medium rounded-lg text-slate-200 border border-slate-700"
            title="Copiar texto do roteiro"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors text-xs font-medium rounded-lg text-white font-semibold"
            title="Baixar arquivo TXT"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar (.txt)</span>
          </button>

          <button
            onClick={() => exportScriptToPDF(script)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-colors text-xs font-medium rounded-lg text-white font-semibold shadow-sm"
            title="Exportar roteiro em formato PDF profissional"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar (.pdf)</span>
          </button>
        </div>
      </div>

      <pre className="text-slate-300 font-mono text-xs overflow-auto max-h-[500px] whitespace-pre p-4 bg-slate-950/60 rounded-lg leading-relaxed select-text shadow-inner border border-slate-900/50">
        {traditionalText}
      </pre>

      <div className="mt-4 bg-indigo-950/30 border border-indigo-900/30 rounded-lg p-3.5 text-xs text-indigo-300">
        <span className="font-bold">Dica Geral:</span> O formato tradicional vertical decompõe as três colunas em blocos sequenciais na ordem lógica de leitura (<span className="text-white font-semibold">Ação ➔ Diálogos ➔ Legendas</span>) para cada painel. É perfeito para enviar a editoras ou desenhistas que preferem a visualização clássica do Final Draft.
      </div>
    </div>
  );
};
