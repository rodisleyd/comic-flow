import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import pdf from "pdf-parse";

dotenv.config();

const app = express();
app.use(express.json());

// Endpoint for PDF extraction
app.post("/api/pdf/parse", express.raw({ type: "application/pdf", limit: "15mb" }), async (req, res) => {
  try {
    const buffer = req.body;
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: "Carregamento vazio. Envie o buffer binário do PDF no corpo da requisição." });
    }

    const parsedData = await pdf(buffer);
    return res.json({ text: parsedData.text || "" });
  } catch (err: any) {
    console.error("Erro no api/pdf/parse:", err);
    return res.status(500).json({ error: err.message || "Erro ocorrendo ao converter arquivo PDF em texto." });
  }
});

// Lazy initialize GoogleGenAI as recommended in the environment guide
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

// Endpoint to improve user's literary argument
app.post("/api/ai/improve-argument", async (req, res) => {
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
});

// Endpoint to split (decouple) argument into page-by-page beats
app.post("/api/ai/decouple", async (req, res) => {
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
});

// Endpoint to improve script fields using gemini-3.5-flash model
app.post("/api/ai/improve", async (req, res) => {
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
});

export default app;
