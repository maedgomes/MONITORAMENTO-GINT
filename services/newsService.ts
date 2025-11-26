import { BotResultItem } from '../types';
import { getLocalDateString, formatDateDisplay, adjustDateForQuery } from '../utils';

// Keywords constants
const LOCATION_KEYWORDS = ['espírito santo', 'es ', ' es ', 'capixaba', 'vitória', 'vila velha', 'serra', 'cariacica', 'viana', 'guarapari', 'fundão', 'cachoeiro', 'itapemirim', 'marataízes', 'castelo', 'iconha', 'piúma', 'linhares', 'colatina', 'são mateus', 'aracruz', 'nova venécia', 'barra de são francisco', 'santa maria de jetibá', 'domingos martins', 'venda nova', 'afonso cláudio', 'guacui', 'alegre', 'ibitirama', 'iúna', 'br-101', 'br-262', 'rodovia do sol', 'terceira ponte'];

const SECURITY_KEYWORDS = ['polícia', 'policia', 'militar', 'civil', 'federal', 'rodoviária', 'prf', 'pmes', 'pces', 'guarda', 'agente', 'bombeiro', 'delegado', 'comandante', 'perito', 'crime', 'criminoso', 'preso', 'prisão', 'detido', 'apreensão', 'apreendido', 'droga', 'entorpecente', 'cocaína', 'maconha', 'crack', 'tráfico', 'traficante', 'arma', 'revólver', 'pistola', 'fuzil', 'munição', 'tiro', 'tiroteio', 'baleado', 'homicídio', 'assassinato', 'morto', 'morte', 'corpo', 'cadáver', 'vítima', 'roubo', 'furto', 'assalto', 'latrocínio', 'sequestro', 'extorsão', 'agressão', 'espancamento', 'maria da penha', 'estupro', 'abuso', 'feminicídio', 'operação', 'investigação', 'inquérito', 'delegacia', 'batalhão', 'dp', 'boletim', 'justiça', 'juiz', 'tribunal', 'mpes', 'ministério público', 'denúncia', 'viatura', 'mandado', 'busca e apreensão', 'flagrante', 'segurança pública', 'defesa social', 'sesp', 'secretaria', 'secretário', 'governo', 'governador', 'investimento', 'recurso', 'verba', 'videomonitoramento', 'cerco inteligente', 'tecnologia', 'inteligência', 'estatística', 'dados', 'balanço', 'redução', 'aumento', 'índice', 'projeto', 'social', 'prevenção', 'cidadania', 'presídio'];

const BLACKLIST = ['horóscopo', 'futebol', 'campeonato', 'novela', 'bbb', 'reality', 'promoção', 'black friday', 'oferta', 'show', 'agenda cultural', 'receita', 'gastronomia', 'turismo', 'brasileirão', 'copa', 'jogo', 'previsão do tempo', 'resumo da novela', 'fofoca', 'bolsonaro', 'lula', 'michelle', 'janja', 'planalto', 'brasília', 'stf', 'congresso', 'câmara dos deputados', 'senado', 'ministro', 'eleições 2026', 'partido liberal', 'pt ', 'pl ', 'concurso', 'edital', 'vaga', 'processo seletivo', 'inscrições', 'estágio', 'trainee', 'emprego', 'sine', 'currículo', 'vestibular'];

export const fetchNews = async (startDate: string, endDate: string): Promise<BotResultItem[]> => {
  let timeFilter = 'when:2d';
  
  if (startDate || endDate) {
    const afterDate = startDate ? adjustDateForQuery(startDate, 'start') : '';
    const beforeDate = endDate ? adjustDateForQuery(endDate, 'end') : '';
    
    let tf = '';
    if (afterDate) tf += ` after:${afterDate}`;
    if (beforeDate) tf += ` before:${beforeDate}`;
    timeFilter = tf.trim();
  }

  const queries = [
    `(Polícia Militar OR PMES OR Polícia Civil OR PCES OR PRF OR "Força Nacional") "Espírito Santo" ${timeFilter}`,
    `(Homicídio OR Tráfico OR Apreensão OR "Operação Policial") "Espírito Santo" ${timeFilter}`,
    `("Guarda Municipal" OR SESP OR "Secretaria de Segurança") "Espírito Santo" ${timeFilter}`,
    `site:agazeta.com.br ("polícia" OR "crime" OR "segurança") ${timeFilter}`,
    `site:folhavitoria.com.br ("polícia" OR "crime" OR "segurança") ${timeFilter}`,
    `site:tribunaonline.com.br ("polícia" OR "crime" OR "segurança") ${timeFilter}`
  ];

  try {
    const promises = queries.map(q => {
      const encodedQuery = encodeURIComponent(q);
      const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
      // Using allorigins to bypass CORS for RSS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
      
      const fetchPromise = fetch(proxyUrl).then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      });
      // 15s timeout
      const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));
      return Promise.race([fetchPromise, timeoutPromise]).catch(err => ({ contents: null }));
    });

    const responses = await Promise.all(promises);
    
    let allItems: BotResultItem[] = [];
    const parser = new DOMParser();

    responses.forEach(data => {
      if (!data || !data.contents) return;
      try {
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const items = xmlDoc.querySelectorAll("item");
        items.forEach(item => {
          const title = item.querySelector("title")?.textContent || "";
          const link = item.querySelector("link")?.textContent || "";
          const pubDateRaw = item.querySelector("pubDate")?.textContent || "";
          const source = item.querySelector("source")?.textContent || "Google News";
          const descriptionRaw = item.querySelector("description")?.textContent || "";
          const doc = new DOMParser().parseFromString(descriptionRaw, 'text/html');
          const cleanDescription = doc.body.textContent || "";

          let formattedDate = getLocalDateString();
          let sortableDate = new Date();
          if (pubDateRaw) {
            try { 
              const d = new Date(pubDateRaw);
              formattedDate = getLocalDateString(d);
              sortableDate = d;
            } catch (e) {}
          }

          if (startDate && formattedDate < startDate) return;
          if (endDate && formattedDate > endDate) return;

          allItems.push({
            id: link,
            title: title.split(" - ")[0],
            link,
            pubDate: formattedDate,
            sortableDate: sortableDate,
            pubDateDisplay: formatDateDisplay(formattedDate),
            source,
            snippet: cleanDescription
          });
        });
      } catch (e) { 
        console.warn("XML Parsing Error", e); 
      }
    });

    const uniqueItems: BotResultItem[] = [];
    const seenLinks = new Set();

    allItems.forEach(item => {
      const cleanLink = item.link.split('?')[0]; 
      if (seenLinks.has(cleanLink)) return;
      
      const fullText = (item.title + " " + item.snippet).toLowerCase();
      if (BLACKLIST.some(term => fullText.includes(term))) return;
      const isSecurity = SECURITY_KEYWORDS.some(term => fullText.includes(term));
      const isLocalSource = fullText.includes('gazeta') || fullText.includes('tribuna') || fullText.includes('folha vitória') || fullText.includes('aquinoticias') || fullText.includes('jornal fato');
      const hasLocation = LOCATION_KEYWORDS.some(loc => fullText.includes(loc));

      if (isSecurity && (hasLocation || isLocalSource)) {
        seenLinks.add(cleanLink);
        uniqueItems.push(item);
      }
    });

    uniqueItems.sort((a, b) => b.sortableDate.getTime() - a.sortableDate.getTime());
    return uniqueItems;

  } catch (error) {
    console.error(error);
    throw new Error("Falha ao buscar notícias. Verifique sua conexão.");
  }
};

export const resolveRealUrl = async (googleUrl: string): Promise<string> => {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(googleUrl)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    if (!data.contents) return googleUrl;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents, 'text/html');
    const canonical = doc.querySelector('link[rel="canonical"]');
    
    if (canonical && (canonical as HTMLLinkElement).href) return (canonical as HTMLLinkElement).href;
    
    const links = doc.querySelectorAll('a[href^="http"]');
    for (let i = 0; i < links.length; i++) {
      const href = links[i].getAttribute('href');
      if (href && !href.includes('google.com') && !href.includes('blogger.com')) return href;
    }
    return googleUrl; 
  } catch (e) { return googleUrl; }
};

export const shortenUrl = async (longUrl: string): Promise<string> => {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://tinyurl.com/api-create.php?url=' + longUrl)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    if (data.contents && data.contents.startsWith('http')) return data.contents;
    return longUrl;
  } catch (error) { return longUrl; }
};
