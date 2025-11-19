import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FeedbackResult, LessonSegment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FEEDBACK_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    accuracy: {
      type: Type.INTEGER,
      description: "A score from 0 to 100. 100 = Perfect or Perfect Paraphrase. 80-99 = Good Meaning but minor diffs. <60 = Wrong meaning.",
    },
    transcription: {
      type: Type.STRING,
      description: "The text transcribed from the user's audio.",
    },
    corrections: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of specific feedback. If they used a valid synonym, mention it positively. If they made a mistake, correct it.",
    },
    encouragement: {
      type: Type.STRING,
      description: "A motivating sentence. If they paraphrased correctly, praise their flexibility.",
    },
  },
  required: ["accuracy", "transcription", "corrections", "encouragement"],
};

const PARSE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      english: { type: Type.STRING, description: "The English sentence or segment." },
      chinese: { type: Type.STRING, description: "The natural Chinese translation of the segment." }
    },
    required: ["english", "chinese"]
  }
};

export const analyzeRecitation = async (
  audioBase64: string,
  targetText: string,
  chineseContext: string,
  mimeType: string = "audio/webm"
): Promise<FeedbackResult> => {
  try {
    if (!audioBase64 || audioBase64.length < 100) {
       throw new Error("Audio data is empty or invalid.");
    }

    const prompt = `
      You are an expert English linguistics teacher.
      
      Context: 
      The student sees this Chinese sentence: "${chineseContext}"
      They are trying to translate/recite it into English.
      The textbook answer is: "${targetText}"

      Task:
      1. Listen to the user's audio.
      2. Evaluate if the user's spoken English accurately conveys the meaning of the Chinese text.
      
      SCORING RULES (Crucial):
      - **Valid Paraphrasing is PERFECT**: If the user uses different words/structure but the meaning is correct and natural (e.g., "It costs a lot" vs "It is expensive"), give a score of 90-100. Do NOT penalize for not matching the textbook exactly. Praise their flexibility.
      - **Grammar Errors**: If the meaning is right but grammar is slightly off, score 70-89.
      - **Wrong Meaning**: If the meaning is different from the Chinese context, score below 60.

      Feedback Guidelines:
      - If they matched the textbook exactly: "Perfect match!"
      - If they paraphrased correctly: "Great alternative! That conveys the same meaning naturally."
      - If they missed key details: Point out the specific missing concept.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: FEEDBACK_SCHEMA,
      },
    });

    const textResponse = response.text;
    if (!textResponse) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(textResponse) as FeedbackResult;
  } catch (error) {
    console.error("Error analyzing recitation:", error);
    return {
      accuracy: 0,
      transcription: "Error analyzing audio.",
      corrections: ["Could not process audio. Please check your microphone or internet connection and try again."],
      encouragement: "Something went wrong. Please try again!",
    };
  }
};

export const parseLearningContent = async (text: string): Promise<Omit<LessonSegment, 'id'>[]> => {
  const prompt = `
    You are an expert language teacher. 
    Task: 
    1. Split the following text into logical segments for memorization and recitation (usually sentence by sentence, or splitting very long sentences into natural clauses).
    2. For each segment, provide the exact English text and a natural Chinese translation.
    3. Return a clean JSON array.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { text: prompt },
        { text: `TEXT TO PROCESS:\n${text}` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: PARSE_SCHEMA,
    }
  });

  const textResponse = response.text;
  if (!textResponse) throw new Error("Failed to parse content");

  return JSON.parse(textResponse);
};