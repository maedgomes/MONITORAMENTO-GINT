import { GoogleGenAI, Type } from "@google/genai";
import { AISummaryResponse, GroundingSearchResult, GroundingSource } from "../types";

// Declare process to avoid TypeScript errors during build
declare const process: {
  env: {
    API_KEY: string;
  };
};

// NOTE: In a real environment, this should be accessed via process.env.API_KEY
// The user provided instructions imply the key is injected in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeText = async (text: string): Promise<AISummaryResponse> => {
  const prompt = `
    Analise o texto da notícia de segurança pública do Espírito Santo (Brasil).
    O objetivo é extrair metadados para um relatório de inteligência.
    Texto: "${text.slice(0, 10000)}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titulo: {
              type: Type.STRING,
              description: "Um título curto, formal e jornalístico sobre o fato.",
            },
            fonte: {
              type: Type.STRING,
              description: "O nome do veículo de imprensa ou fonte (ex: A Gazeta, Tribuna, PCES).",
            },
            resumo: {
              type: Type.STRING,
              description: "Um resumo executivo de 1 parágrafo (máximo 3 linhas) focado nos fatos principais.",
            },
            data: {
              type: Type.STRING,
              description: "A data do fato no formato AAAA-MM-DD. Se não houver, use a data de hoje.",
            },
          },
          required: ["titulo", "fonte", "resumo", "data"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Sem resposta da IA");

    return JSON.parse(jsonText) as AISummaryResponse;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Erro ao processar o texto com inteligência artificial.");
  }
};

export const performGroundingSearch = async (query: string): Promise<GroundingSearchResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Responda de forma concisa e objetiva para um analista de segurança: ${query}`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "Não foi possível gerar uma resposta.";
    
    // Extract grounding sources
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({
          title: chunk.web.title,
          uri: chunk.web.uri
        });
      }
    });

    return { text, sources };
  } catch (error) {
    console.error("Grounding Search Error:", error);
    throw new Error("Erro ao realizar pesquisa na web.");
  }
};