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
    const { argument, pageCount } = req.body;
    if (!argument || !pageCount) {
      return res.status(400).json({ error: "Os parâmetros 'argumento' e 'pageCount' são necessários." });
    }

    const pages = parseInt(pageCount, 10);
    if (isNaN(pages) || pages < 1 || pages > 120) {
      return res.status(400).json({ error: "Número de páginas deve ser um valor numérico entre 1 e 120." });
    }

    const ai = getAi();
    const systemInstruction = `Você é um Diretor Cinematográfico e Roteirista especializado em Decupagem Sequencial de Histórias em Quadrinhos.
Sua missão é ler o argumento literário fornecido e dividi-lo de forma perfeitamente equilibrada e fluida em exatamente ${pages} páginas de HQ.
Para cada uma das ${pages} páginas, você deve criar um "Beat" (descrição resumida da página). Cada Beat deve resumir claramente qual evento dramático, ambientação espacial, ações visuais predominantes e diálogos implícitos ocorrem especificamente na respectiva página.
Evite comprimir história demais em poucas páginas ou deixar páginas sem ação. Busque uma distribuição orgânica (Início, Desenvolvimento, Clímax e Conclusão) que respeite o limite de exatamente ${pages} páginas.
Forneça a sua resposta estritamente estruturada em formato JSON válido contendo uma lista sob a chave "beats". Cada item da lista deve conter "pageNumber" e "description". Adicionalmente, forneça um breve campo "summary" descrevendo sua lógica de divisão orquestrada.`;

    const prompt = `Faça a divisão sequencial do seguinte argumento dramático em exatamente ${pages} páginas de quadrinhos:

ARGUMENTO DO AUTOR:
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
            beats: {
              type: Type.ARRAY,
              description: `Lista de exatamente ${pages} descrições ordenadas, uma para cada página`,
              items: {
                type: Type.OBJECT,
                properties: {
                  pageNumber: { type: Type.INTEGER, description: "O número sequencial da página" },
                  description: { type: Type.STRING, description: "Resumo do que acontece dramaticamente e conceitualmente nesta página" }
                },
                required: ["pageNumber", "description"]
              }
            },
            summary: { type: Type.STRING, description: "Breve explicação sobre os pontos de virada ou ritmo adotado" }
          },
          required: ["beats", "summary"]
        },
        temperature: 0.6,
      },
    });

    const parsedResult = JSON.parse(response.text || "{}");
    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Erro no api/ai/decouple:", error);
    return res.status(500).json({ error: error.message || "Erro interno do servidor ao gerar a decupagem de páginas." });
  }
}
