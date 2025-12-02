import { GoogleGenAI, Type } from "@google/genai";
import { InterviewQuestion, EvaluationResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-2.5-flash";

export const generateInterviewQuestions = async (jobTitle: string, experienceLevel: string): Promise<InterviewQuestion[]> => {
  // Modified prompt to request Chinese content
  const prompt = `为职位 "${jobTitle}" 且经验要求为 "${experienceLevel}" 的候选人生成5个结构化面试问题。
  请使用中文生成。包含技术问题和行为问题。
  Return the response in JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING, description: "The question text in Chinese" },
              category: { type: Type.STRING, description: "Category in Chinese (e.g., 技术, 软技能)" },
              difficulty: { type: Type.STRING, enum: ["简单", "中等", "困难"] }
            },
            required: ["id", "text", "category", "difficulty"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as InterviewQuestion[];
  } catch (error) {
    console.error("Error generating questions:", error);
    return [];
  }
};

export const evaluateCandidateResponse = async (question: string, answer: string): Promise<EvaluationResult | null> => {
  // Modified prompt to request Chinese content
  const prompt = `请针对面试问题：“${question}” 评估候选人的以下回答：
  
  候选人回答：“${answer}”
  
  请提供1-10分的评分，以及建设性的反馈、优点和缺点。所有文本请使用中文。`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING, description: "Feedback in Chinese" },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING, description: "Strength point in Chinese" } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING, description: "Weakness point in Chinese" } }
          },
          required: ["score", "feedback", "strengths", "weaknesses"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as EvaluationResult;
  } catch (error) {
    console.error("Error evaluating response:", error);
    return null;
  }
};