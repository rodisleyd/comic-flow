import { jsPDF } from 'jspdf';
import { ComicScript } from '../types.ts';

/**
 * Função para exportar o roteiro estruturado para PDF 
 * seguindo a estética exata e fiel compartilhada pelo usuário:
 * - Tab superior "PÁGINA X" em ciano/azul piscina.
 * - Grid em 3 colunas (AÇÃO, DIÁLOGOS, LEGENDAS).
 * - Separadores de linha pretos com bloco de cabeçalho preto "PAINEL X".
 * - Algoritmo avançado de paginação segura para texto fluir sem transbordar.
 */
export function exportScriptToPDF(script: ComicScript) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const marginX = 40;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const contentWidth = pageWidth - (2 * marginX); // 515.28
  const bottomMargin = 775;

  let y = 40;
  let pageNum = 1;

  // Definição das Larguras e Posições das Colunas
  const colWidths = [210, 160, 145.28];
  const colXPositions = [
    marginX,
    marginX + colWidths[0],
    marginX + colWidths[0] + colWidths[1]
  ];

  // Helper para desenhar o belo rodapé minimalista
  const drawPageFooter = (currentDoc: jsPDF, pageNo: number) => {
    currentDoc.setFont('Helvetica', 'normal');
    currentDoc.setFontSize(8);
    currentDoc.setTextColor(156, 163, 175);
    
    // Linha fina divisória de rodapé
    currentDoc.setDrawColor(229, 231, 235);
    currentDoc.setLineWidth(0.5);
    currentDoc.line(marginX, bottomMargin + 10, pageWidth - marginX, bottomMargin + 10);

    const docTitle = (script.title || "ROTEIRO").toUpperCase();
    const treatmentText = script.treatment ? ` (${script.treatment.toUpperCase()})` : '';
    currentDoc.text(`HQ ORIGINAL: ${docTitle}${treatmentText} | AUTOR: ${(script.author || "ANÔNIMO").toUpperCase()}`, marginX, bottomMargin + 24);
    currentDoc.text(`PÁGINA ${pageNo}`, pageWidth - marginX - currentDoc.getTextWidth(`PÁGINA ${pageNo}`), bottomMargin + 24);
  };

  // =========================================================================
  // 1. CABEÇALHO DA PRIMEIRA PÁGINA (CAPA COMPACTA INTEGRADA)
  // =========================================================================
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39); // Slate-900
  const titleText = (script.title || 'ROTEIRO DE HQ').toUpperCase();
  doc.text(titleText, marginX, y);
  y += 18;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  const authorAndTreatment = `ROTEIRISTA/AUTOR: ${(script.author || 'ANÔNIMO').toUpperCase()}${script.treatment ? ` | TRATAMENTO: ${script.treatment.toUpperCase()}` : ''}`;
  doc.text(authorAndTreatment, marginX, y);

  const metaRight = `Sincronia de Estado: OK | Total de Páginas: ${script.pages.length}`;
  doc.text(metaRight, pageWidth - marginX - doc.getTextWidth(metaRight), y);
  y += 10;

  doc.setDrawColor(209, 213, 219); // Gray-300
  doc.setLineWidth(1);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 25;

  if (script.description && script.description.trim()) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text("SINOPSE / LOGLINE DA CENA:", marginX, y);
    y += 12;

    doc.setFont('Helvetica', 'oblique');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(script.description, contentWidth);
    
    splitDesc.forEach((line: string) => {
      if (y + 12 > bottomMargin) {
        drawPageFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        y = 50;
      }
      doc.text(line, marginX, y);
      y += 13;
    });
    y += 15;
  }

  // =========================================================================
  // 2. ITERADOR DE PÁGINAS E PAINÉIS EM GRID DE 3 COLUNAS
  // =========================================================================
  script.pages.forEach((page) => {
    // Garante que a transição de novas páginas comece com excelente respiro superior
    if (y > 70) {
      drawPageFooter(doc, pageNum);
      doc.addPage();
      pageNum++;
      y = 50;
    }

    // A. Elemento Ciano/Azul Piscina "PÁGINA X" correspondente perfeito ao screenshot do usuário
    if (y + 35 > bottomMargin) {
      drawPageFooter(doc, pageNum);
      doc.addPage();
      pageNum++;
      y = 50;
    }

    doc.setFillColor(0, 168, 232); // Ciano exato
    doc.rect(marginX, y, 95, 20, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`PÁGINA ${page.number}`, marginX + 12, y + 13);
    y += 28;

    // B. Renderização de Painéis dentro do Grid de 3 Colunas sob paginação segura
    page.panels.forEach((panel) => {
      // Pré-split de textos e cálculo de altura estimada para manter coesão visual e evitar transbordamento
      const actionText = panel.action.trim() || '-';
      const dialogueText = panel.dialogues.trim() || '-';
      const captionText = panel.captions.trim() || '-';

      const linesAction = doc.splitTextToSize(actionText, colWidths[0] - 16);
      const linesDialogue = doc.splitTextToSize(dialogueText, colWidths[1] - 16);
      const linesCaption = doc.splitTextToSize(captionText, colWidths[2] - 16);

      const maxLines = Math.max(linesAction.length, linesDialogue.length, linesCaption.length);
      const lineHeight = 13.5;
      const paddingY = 9;

      // Se não houver espaço suficiente para desenhar pelo menos os cabeçalhos e as 3 primeiras linhas do corpo, pulamos página
      const heightNeededToStart = 22 + 18 + paddingY + (lineHeight * Math.min(3, maxLines));
      if (y + heightNeededToStart > bottomMargin) {
        drawPageFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        y = 50;
      }

      // I. Desenha o cabeçalho preto "PAINEL X"
      doc.setFillColor(0, 0, 0);
      doc.rect(marginX, y, contentWidth, 22, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`PAINEL ${panel.number}`, marginX + 10, y + 14);
      y += 22;

      // II. Desenha a linha de controle de subcabeçalho de colunas (Cinza claro, bordas pretas)
      doc.setFillColor(220, 224, 227); // #DCDFE3 cinza perfeito
      doc.rect(marginX, y, contentWidth, 18, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(marginX, y, contentWidth, 18, 'S');

      // Desenha as divisões verticais dos subcabeçalhos
      doc.line(colXPositions[1], y, colXPositions[1], y + 18);
      doc.line(colXPositions[2], y, colXPositions[2], y + 18);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text("AÇÃO", colXPositions[0] + 10, y + 12);
      doc.text("DIÁLOGOS", colXPositions[1] + 10, y + 12);
      doc.text("LEGENDAS", colXPositions[2] + 10, y + 12);
      y += 18;

      let rowStartY = y;

      // Helper inline para encerar e traçar todas as bordas e divisões verticais dos painéis
      const drawRowBordersAndLines = (startY: number, endY: number) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.rect(marginX, startY, contentWidth, endY - startY, 'S');
        doc.line(colXPositions[1], startY, colXPositions[1], endY);
        doc.line(colXPositions[2], startY, colXPositions[2], endY);
      };

      y += paddingY;

      // III. Processamento dinâmico linha por linha do Grid
      for (let i = 0; i < maxLines; i++) {
        // Se a próxima linha for estourar o limite de rodapé, quebramos a página mantendo a estrutura íntegra
        if (y + lineHeight > bottomMargin) {
          // Fecha bordas do pedaço de registro atual
          drawRowBordersAndLines(rowStartY, y + 4);
          
          drawPageFooter(doc, pageNum);
          doc.addPage();
          pageNum++;
          y = 50;

          // Desenha barra informativa de continuação "PAINEL X (CONTINUAÇÃO)"
          doc.setFillColor(0, 0, 0);
          doc.rect(marginX, y, contentWidth, 20, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text(`PAINEL ${panel.number} (CONTINUAÇÃO)`, marginX + 10, y + 13);
          y += 20;

          // Redesenha os subcabeçalhos na nova página para dar total clareza ao desenhista!
          doc.setFillColor(220, 224, 227);
          doc.rect(marginX, y, contentWidth, 18, 'F');
          doc.rect(marginX, y, contentWidth, 18, 'S');
          doc.line(colXPositions[1], y, colXPositions[1], y + 18);
          doc.line(colXPositions[2], y, colXPositions[2], y + 18);

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text("AÇÃO", colXPositions[0] + 10, y + 12);
          doc.text("DIÁLOGOS", colXPositions[1] + 10, y + 12);
          doc.text("LEGENDAS", colXPositions[2] + 10, y + 12);
          y += 18;

          rowStartY = y;
          y += paddingY;
        }

        // --- COLUNA 1: AÇÃO ---
        if (i < linesAction.length) {
          const rawLine = linesAction[i].trim();
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(17, 24, 39);

          // Verifica se a linha contém enquadramento ou destaque em negrito usando markdown simples `**`
          if (rawLine.includes('**')) {
            const parts = rawLine.split('**');
            let runX = colXPositions[0] + 10;
            parts.forEach((part, partIdx) => {
              if (partIdx % 2 === 1) {
                doc.setFont('Helvetica', 'bold');
              } else {
                doc.setFont('Helvetica', 'normal');
              }
              if (part) {
                doc.text(part, runX, y + 3);
                runX += doc.getTextWidth(part) + 1.5;
              }
            });
          } else {
            doc.text(rawLine, colXPositions[0] + 10, y + 3);
          }
        }

        // --- COLUNA 2: DIÁLOGOS ---
        if (i < linesDialogue.length) {
          const rawLine = linesDialogue[i].trim();
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(17, 24, 39);

          // Estiliza character speech e marcadores: Ex "NOME DO PERSONAGEM: fala..." ou "NOME DO PERSONAGEM"
          const isFullCaps = rawLine === rawLine.toUpperCase() && rawLine.length > 1 && !rawLine.includes('(') && !rawLine.includes(':');
          const hasColon = rawLine.includes(':') && (rawLine.split(':')[0] === rawLine.split(':')[0].toUpperCase());

          if (isFullCaps) {
            doc.setFont('Helvetica', 'bold');
            doc.text(rawLine, colXPositions[1] + 10, y + 3);
          } else if (hasColon) {
            const parts = rawLine.split(':');
            const prefix = parts[0] + ':';
            const suffix = parts.slice(1).join(':');

            doc.setFont('Helvetica', 'bold');
            doc.text(prefix, colXPositions[1] + 10, y + 3);

            doc.setFont('Helvetica', 'normal');
            const prefixWidth = doc.getTextWidth(prefix + ' ');
            doc.text(suffix, colXPositions[1] + 10 + prefixWidth, y + 3);
          } else {
            doc.text(rawLine, colXPositions[1] + 10, y + 3);
          }
        }

        // --- COLUNA 3: LEGENDAS ---
        if (i < linesCaption.length) {
          const rawLine = linesCaption[i].trim();
          doc.setFontSize(9);

          const isQuoted = (rawLine.startsWith('"') && rawLine.endsWith('"')) || rawLine.startsWith('«') || rawLine.startsWith('(');
          const isSFX = rawLine.toUpperCase().startsWith('SFX:') || rawLine.toUpperCase().startsWith('EFEITO:');

          if (isSFX) {
            doc.setFont('Courier', 'bold'); // Monofone e expressivo para efeitos de som
            doc.setTextColor(29, 78, 216); // Azul vibrante
            doc.text(rawLine, colXPositions[2] + 10, y + 3);
          } else if (isQuoted) {
            doc.setFont('Helvetica', 'oblique'); // Itálico suave e elegante
            doc.setTextColor(55, 65, 81);
            doc.text(rawLine, colXPositions[2] + 10, y + 3);
          } else {
            doc.setFont('Helvetica', 'oblique');
            doc.setTextColor(17, 24, 39);
            doc.text(rawLine, colXPositions[2] + 10, y + 3);
          }
        }

        y += lineHeight;
      }

      // Margem inferior da célula de dados
      y += (paddingY - 5);

      // Sela as bordas completas do painel
      drawRowBordersAndLines(rowStartY, y);

      // Divisória limpa e generosa para o início do próximo bloco
      y += 18;
    });
  });

  // Fecha as informações finais de rodapé do documento gerado
  drawPageFooter(doc, pageNum);

  // Nomeação inteligente livre de diacríticos e caracteres prejudiciais ao download de arquivos
  const cleanTitle = (script.title || 'roteiro')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  const finalFileName = `${cleanTitle}-roteiro-hq.pdf`;
  doc.save(finalFileName);
}
