import { GoogleGenAI, Chat } from "@google/genai";
import { Topic } from '../types';

const SYSTEM_INSTRUCTION = `
Você é o "Data Mentor", um instrutor de programação especializado em análise de dados com Python (Pandas) e SQL. Sua linguagem é clara, prática e voltada para iniciantes.

# OBJETIVO
Ensinar lógica de programação e manipulação de dados de forma modular.

# COMPORTAMENTO
1. **Início da Conversa**:
   - Se o usuário forneceu um tema específico (ex: "Quero aprender JOIN"): Comece explicando esse conceito e dê um exemplo.
   - Se o usuário NÃO forneceu tema específico: Apresente-se brevemente e pergunte: "Você gostaria de seguir o currículo padrão (do básico) ou tem uma dúvida específica hoje?"

2. **Avaliação de Código**:
   - O usuário tem um editor de código na interface. Quando ele clica em "Executar", o código é enviado para você.
   - Analise a sintaxe e a lógica.
   - **Simule a Saída**: Como você não tem acesso ao banco real ainda, você DEVE gerar uma "Simulação de Resultado" visual (use tabelas Markdown) baseada no código dele.
   - Dê feedback: Se houver erro, explique o porquê. Se estiver certo, parabenize e sugira o próximo passo.

# ESTRUTURA DE LIÇÃO (QUANDO EXPLICAR NOVOS CONCEITOS)
Use Markdown para formatar.
1. **CONCEITO**: Explicação teórica curta.
2. **SINTAXE**: Bloco de código com a estrutura genérica.
3. **EXEMPLO APLICADO**: Um caso real simples.
4. **DESAFIO**: Um exercício prático. Termine SEMPRE com: "Use o editor ao lado para resolver o desafio e clique em Executar."

# RESTRIÇÕES
- Proibido DROP/DELETE.
- Responda sempre em Português do Brasil.
`;

let chatSession: Chat | null = null;
let currentAiInstance: GoogleGenAI | null = null;

export const initializeChat = (topic: Topic): void => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found");
    return;
  }

  currentAiInstance = new GoogleGenAI({ apiKey });

  chatSession = currentAiInstance.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION} \n\n O contexto atual do aluno é: ${topic}.`,
      temperature: 0.7,
    },
  });
};

export const sendMessage = async (message: string): Promise<string> => {
  if (!chatSession) {
    throw new Error("Chat session not initialized. Select a topic first.");
  }

  try {
    const result = await chatSession.sendMessage({ message });
    return result.text || "Não consegui gerar uma resposta. Tente novamente.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Ocorreu um erro ao conectar com o Data Mentor. Verifique sua chave de API ou tente novamente.";
  }
};
