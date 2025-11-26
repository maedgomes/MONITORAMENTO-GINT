import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NewsItem } from "../types";
import { formatDateDisplay } from "../utils";

export const generatePDF = (items: NewsItem[]) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('pt-BR');

  // --- HEADER ---
  // Background (Dark Blue/Slate-900 like #0f172a)
  doc.setFillColor(15, 23, 42); 
  doc.rect(0, 0, 210, 50, 'F'); // Width A4 is 210mm

  // Main Title (Amber/Yellow like #f59e0b)
  doc.setTextColor(245, 158, 11); 
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('OBSERVATÓRIO GINT', 14, 20);

  // Subtitle (White)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('INTELIGÊNCIA EM SEGURANÇA PÚBLICA - ESPÍRITO SANTO', 14, 28);

  // Generation Date (Gray/Slate-400)
  doc.setTextColor(148, 163, 184); 
  doc.setFontSize(9);
  doc.text(`Gerado em: ${today}`, 14, 40);

  // --- CONTENT ---
  // Section Title
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE NOTÍCIAS', 14, 65);

  // Table Config
  const tableColumn = ["#", "Data", "Fonte", "Título", "Resumo"];
  const tableRows = items.map((item, index) => [
    index + 1,
    formatDateDisplay(item.data),
    item.fonte,
    item.titulo,
    item.resumo
  ]);

  // Render Table
  autoTable(doc, {
    startY: 70,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Match Header Background
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left'
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
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 50, fontStyle: 'bold' },
      4: { cellWidth: 'auto' } // Auto width for Summary
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