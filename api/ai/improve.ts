import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
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
  // Apenas aceita requisições do tipo POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const { field, content, scriptContext } = req.body;
    if (!field || !content) {
      return res.status(400).json({ error: "Parâmetros 'field' e 'content' são necessários." });
    }

    const ai = getAi();

    let fieldLabel = "Ação Visual";
    let instructions = "";

    if (field === "action") {
      fieldLabel = "Ações Visuais (Ação/Cenário)";
      instructions = `Aprimore a ação para ser mais direta, visual e clara para o desenhista. Melhore a descrição de planos de câmera, iluminação ou expressões se fizer sentido, mantendo a essência exata do roteirista. Não invente novos personagens ou fatos não descritos. Mantenha os termos de enquadramento em maiúsculo (ex: PLANO DETALHE, PLANO GERAL).`;
    } else if (field === "dialogues") {
      fieldLabel = "Personagens & Diálogos";
      instructions = `Refine o ritmo, pontuação de drama e naturalidade dos diálogos. Respeite fielmente os nomes de personagens em maiúsculas (ex: NOME DO PERSONAGEM) e intenções entre parênteses (ex: (rindo)), aprimorando as falas sem descaracterizar a voz única de cada um. Não modifique a estrutura das linhas de diálogo e não crie conversas inteiras novas.`;
    } else if (field === "captions") {
      fieldLabel = "Legendas e Onomatopeias (SFX)";
      instructions = `Refine a atmosfera lírica da narração, legendas narrativas ou onomatopeias de efeito (SFX) para torná-las mais cinematográficas ou impactantes. Mantenha os prefixos LEGENDA: ou SF: se fornecidos originais.`;
    }

    const systemInstruction = `Você é um Consultor Editorial e Revisor Sênior de Quadrinhos (HQ/Comics).
Sua missão é ajudar o escritor a aprimorar ortografia, gramática, ritmo, naturalidade e clareza de textos para o campo "${fieldLabel}" de um painel de roteiro.
Você deve respeitar estritamente a essência e o tom do autor, fazendo correções cirúrgicas de escrita ("sem viajar", mantendo a proposta realista, cômica ou dramática do texto).
Forneça sua resposta em dois blocos organizados em formato JSON. O JSON DEVE ter o seguinte formato estrito:
{
  "suggestion": "O texto otimizado final aqui",
  "explanation": "Uma explicação concisa, em português, destacando quais melhorias foram feitas (ex: pontuação, escolha gramatical, ritmo) de forma amigável e de mentoria."
}
Atenção: Não coloque blocos de código markdown nem texto extra na resposta, retorne APENAS o JSON válido para podermos convertê-lo diretamente com JSON.parse.`;

    const prompt = `Melhore o seguinte conteúdo original do campo "${fieldLabel}":

TEXTO ORIGINAL A SER REVISADO:
"""
${content}
"""

Contexto Adicional do Roteiro (Caso ajude no contexto):
Título da HQ: ${scriptContext?.title || "Roteiro"}
Sinopse/Parâmetros: ${scriptContext?.description || ""}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const textResponse = response.text || "{}";
    const cleanedText = textResponse.trim().replace(/^```json/, "").replace(/```$/, "").trim();
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.warn("Falha ao analisar JSON da IA:", textResponse);
      parsedResult = {
        suggestion: content,
        explanation: "Não foi possível estruturar as modificações de forma automática, mas o texto original foi mantido com segurança."
      };
    }

    return res.json(parsedResult);
  } catch (error: any) {
    console.error("Erro no api/ai/improve:", error);
    return res.status(500).json({ error: error.message || "Erro interno do servidor ao consultar a IA." });
  }
}
