export const getLocalDateString = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateDisplay = (dateString: string) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const getDayOnly = (dateString: string) => {
  if (!dateString) return '';
  return dateString.split('-')[2] || '';
};

export const getMonthAbbr = (dateString: string) => {
  if (!dateString) return '';
  const monthStr = dateString.split('-')[1];
  const months: Record<string, string> = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR', '05': 'MAI', '06': 'JUN',
    '07': 'JUL', '08': 'AGO', '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
  };
  return months[monthStr] || '';
};

export const adjustDateForQuery = (dateStr: string, type: 'start' | 'end') => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  if (type === 'start') date.setDate(date.getDate() - 1);
  else if (type === 'end') date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};

export const generateTextReport = (items: any[]) => {
  const today = new Date().toLocaleDateString('pt-BR');
  let report = `🚨 *OBSERVATÓRIO GINT* - ${today}\n\n`;
  if (items.length === 0) report += "Sem registros para a data selecionada.\n";
  else {
    items.forEach((item, index) => {
      report += `*${index + 1}. ${item.titulo}* (${formatDateDisplay(item.data)})\n`;
      report += `📝 ${item.resumo}\n`;
      report += `📰 Fonte: ${item.fonte}\n`;
      if (item.link) report += `🔗 ${item.link}\n`;
      report += `\n`;
    });
  }
  return report;
};

export const copyToClipboardHelper = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (e) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};
