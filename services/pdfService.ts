import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NewsItem } from "../types";
import { formatDateDisplay } from "../utils";

export const generatePDF = (items: NewsItem[]) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');

  // --- HEADER ---
  // Background (Slate-900)
  doc.setFillColor(15, 23, 42); 
  doc.rect(0, 0, 210, 50, 'F'); 

  // Accent Line (Amber-500)
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(1);
  doc.line(14, 45, 196, 45);

  // Main Title (Amber-500)
  doc.setTextColor(245, 158, 11); 
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('OBSERVATÓRIO GINT', 14, 25);

  // Subtitle (White)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('INTELIGÊNCIA EM SEGURANÇA PÚBLICA - ESPÍRITO SANTO', 14, 33);

  // Generation Date (Slate-400)
  doc.setTextColor(148, 163, 184); 
  doc.setFontSize(9);
  doc.text(`Relatório gerado em: ${today}`, 14, 60);

  // --- CONTENT ---
  
  // Table Config
  // Alterado "Resumo" para "Link" conforme solicitado
  const tableColumn = ["Data", "Fonte", "Título", "Link"];
  const tableRows = items.map((item) => [
    formatDateDisplay(item.data),
    item.fonte,
    item.titulo,
    item.link // Substituído item.resumo por item.link
  ]);

  // Render Table
  autoTable(doc, {
    startY: 65,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [245, 158, 11], // Amber-500
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
      lineWidth: 0
    },
    bodyStyles: {
      textColor: [51, 65, 85], // Slate-700
      fontSize: 9,
      valign: 'top',
      lineColor: [226, 232, 240] // Slate-200
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Slate-50
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 60, fontStyle: 'bold' }, // Aumentei um pouco a largura do título
      3: { cellWidth: 'auto' } // Link ocupará o restante
    },
    margin: { top: 70 }
  });

  // Footer / Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      'Página ' + i + ' de ' + pageCount, 
      doc.internal.pageSize.width - 20, 
      doc.internal.pageSize.height - 10, 
      { align: 'right' }
    );
  }

  // Save File
  doc.save(`Relatorio_GINT_${today.replace(/\//g, '-')}.pdf`);
};