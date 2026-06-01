import type { VercelRequest, VercelResponse } from "@vercel/node";
import pdf from "pdf-parse";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

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
}
