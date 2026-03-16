import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface MeditationSession {
  title: string;
  script: string;
  imageUrl: string;
  audioData: string; // base64
}

export const generateMeditationSession = async (prompt: string): Promise<MeditationSession> => {
  // 1. Generate Script
  const scriptResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Create a guided meditation script (about 150-200 words) for the following theme: "${prompt}". 
    The script should be soothing, include pauses [pause], and focus on breathing and mindfulness.
    Also provide a short, calming title for this session.
    Return the response in JSON format with "title" and "script" fields.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          script: { type: Type.STRING },
        },
        required: ["title", "script"],
      },
    },
  });

  const { title, script } = JSON.parse(scriptResponse.text || "{}");

  // 2. Generate Visuals
  const imageResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          text: `A highly atmospheric, minimalist, and calming abstract background for a meditation session themed: "${prompt}". 
          Use soft colors, ethereal light, and a sense of vastness. No text, no people. 4k resolution style.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  let imageUrl = "";
  for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  // 3. Generate Speech
  const ttsResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this meditation script slowly and calmly: ${script.replace(/\[pause\]/g, '... ')}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a soft, calm voice
        },
      },
    },
  });

  const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";

  return { title, script, imageUrl, audioData };
};

export const chatWithGemini = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: "You are a wise and compassionate meditation guide. Help users with their mindfulness practice, answer questions about meditation, and provide encouragement. Keep responses concise and peaceful.",
    },
  });

  // Reconstruct history
  // Note: createChat doesn't take history directly in this SDK version's create method easily, 
  // but we can send messages sequentially or just use generateContent for simple chat.
  // Actually, let's use sendMessage for a real chat session if possible, or just generateContent.
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
  });

  return response.text;
};
