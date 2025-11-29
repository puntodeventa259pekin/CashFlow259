import { GoogleGenAI } from "@google/genai";
import { Transaction, Holder, Debt } from '../types';

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const analyzeFinances = async (
  transactions: Transaction[],
  holders: Holder[],
  debts: Debt[]
): Promise<string> => {
  try {
    const dataSummary = JSON.stringify({
      transactions: transactions.slice(-20), // Analyze last 20 for speed
      holders,
      debts: debts.filter(d => !d.isPaid)
    });

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Actúa como un asesor financiero experto para una pequeña empresa. 
      Analiza los siguientes datos financieros (en formato JSON) que incluyen transacciones recientes, 
      saldos de custodios (empleados con efectivo) y deudas pendientes.
      
      Datos: ${dataSummary}
      
      Proporciona un resumen ejecutivo en español con:
      1. Estado actual del flujo de efectivo.
      2. Alertas sobre deudas pendientes o saldos inusuales.
      3. Recomendaciones breves para mejorar la liquidez.
      
      Mantén el tono profesional y conciso. Usa formato Markdown.`,
      config: {
        temperature: 0.2,
      }
    });

    return response.text || "No se pudo generar el análisis en este momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Ocurrió un error al conectar con el asistente inteligente. Por favor verifica tu conexión o clave API.";
  }
};