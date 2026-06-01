import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("A chave GEMINI_API_KEY não foi configurada nas configurações do applet.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const { argument } = req.body;
    if (!argument) {
      return res.status(400).json({ error: "O argumento de história é obrigatório." });
    }

    const ai = getAi();
    const systemInstruction = `Você é um Roteirista e Consultor Editorial Sênior de Histórias em Quadrinhos (HQ/Mangá/Graphic Novel).
Sua missão é ajudar o escritor a aprimorar, encorpar e dar ritmo mais dramático/visual ao argumento de sua história, respeitando o limite máximo aproximado de 3000 caracteres.
Aprimore o texto para torná-lo mais polido, rico em detalhes expressivos e fluido para subsequente decupagem em páginas. Corrija erros gramaticais ou de digitação, mantendo estritamente a essência, os personagens, as reviravoltas e o gênero desejados pelo autor.
Você DEVE fornecer sua resposta estritamente estruturada em formato JSON válido com as seguintes chaves: "original", "improved" e "explanation".`;

    const prompt = `Melhore e refine o seguinte argumento original, preparando-o para ser transformado em um roteiro página a página:

ARGUMENTO ORIGINAL DO AUTOR:
"""
${argument}
"""`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING, description: "O argumento original fornecido" },
            improved: { type: Type.STRING, description: "O argumento polido e melhorado pela inteligência artificial" },
            explanation: { type: Type.STRING, description: "Um breve parágrafo em português explicando quais pontos críticos de drama ou ritmo foram polidos" }
          },
          required: ["original", "improved", "explanation"]
        },
        temperature: 0.7,
      },
    });

    const parsedResult = JSON.parse(response.text || "{}");
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Erro no api/ai/improve-argument:", error);
    return res.status(500).json({ error: error.message || "Erro interno do servidor ao melhorar argumento." });
  }
}
