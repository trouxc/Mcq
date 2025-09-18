import { GoogleGenAI, Type } from "@google/genai";
import { type MCQ } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: "The multiple-choice question."
      },
      options: {
        type: Type.ARRAY,
        description: "An array of 4 possible answers.",
        items: {
          type: Type.STRING,
        }
      },
      answer: {
        type: Type.STRING,
        description: "The correct answer, which must be one of the strings from the 'options' array."
      },
    },
    required: ["question", "options", "answer"],
  },
};

export async function generateMcqsFromText(text: string, numQuestions: number): Promise<MCQ[]> {
  try {
    const prompt = `Based on the following text, generate ${numQuestions} challenging multiple-choice questions in ENGLISH.
Each question must have exactly 4 options and one single correct answer.
The correct answer must be an exact match to one of the options.
Ensure the questions are relevant to the main topics of the text and suitable for a test.

Text:
---
${text}
---
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const generatedMcqs = JSON.parse(jsonText);

    if (!Array.isArray(generatedMcqs)) {
      throw new Error("API did not return a valid array of MCQs.");
    }
    
    // Basic validation
    return generatedMcqs.filter(mcq => 
        mcq.question && 
        Array.isArray(mcq.options) && 
        mcq.options.length > 0 && 
        mcq.answer &&
        mcq.options.includes(mcq.answer)
    );

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate MCQs from the provided text.");
  }
}

export async function translateText(textToTranslate: string): Promise<string> {
    if (!textToTranslate) return "";
    try {
        const prompt = `Translate the following English text to Arabic. Provide only the Arabic translation, without any introductory phrases or explanations.

English text: "${textToTranslate}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for translation:", error);
        return "Translation failed.";
    }
}
