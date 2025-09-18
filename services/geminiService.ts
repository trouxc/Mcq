import { GoogleGenAI, Type } from "@google/genai";
import { type MCQ } from "../types";

// Helper function to get the AI instance and check for the API key at runtime.
// This prevents the app from crashing on load if the API key is not set.
function getAiInstance() {
  const apiKey = process.env.API_KEY as string;
  if (!apiKey) {
    throw new Error("Google Gemini API Key is missing. Please set it as an environment variable named 'API_KEY' in your deployment settings. For example, on Netlify, go to Site settings > Build & deploy > Environment, and add a new variable.");
  }
  return new GoogleGenAI({ apiKey });
}

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
    const ai = getAiInstance(); // Get instance here
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
    if (error instanceof Error && (error.message.includes("API key") || error.message.includes("API Key"))) {
        throw error;
    }
    throw new Error("Failed to generate MCQs from the provided text.");
  }
}

export async function translateText(textToTranslate: string): Promise<string> {
    if (!textToTranslate) return "";
    try {
        const ai = getAiInstance(); // Get instance here
        const prompt = `Translate the following English text to Arabic. Provide only the Arabic translation, without any introductory phrases or explanations.

English text: "${textToTranslate}"`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for translation:", error);
        if (error instanceof Error && (error.message.includes("API key") || error.message.includes("API Key"))) {
            // Re-throw the specific API key error to be caught by the component
            throw error;
        }
        return "Translation failed.";
    }
}