import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CourseStructure, LessonContent, QuizQuestion, TutorProfile } from "../types";

// Helper to get initialized client safely
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Helper to write string to DataView for WAV header
 */
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Helper to clean Base64 string
 */
function cleanBase64(str: string): string {
  return str.replace(/[\r\n\s]/g, '');
}

/**
 * Helper to retry async operations with exponential backoff
 */
async function withRetry<T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isNetworkError = error.message?.includes('xhr') || error.message?.includes('fetch') || error.message?.includes('NetworkError');
    const isServerError = error.status === 503 || error.status === 500;
    
    if (retries > 0 && (isNetworkError || isServerError)) {
      console.warn(`Retrying operation... attempts left: ${retries}. Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Converts raw PCM data to a WAV Blob by adding a RIFF header.
 * Gemini 2.5 Flash TTS returns raw PCM at 24kHz.
 */
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const pcmBytes = new Uint8Array(buffer, 44);
  pcmBytes.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Analyzes the uploaded PDF and creates a structured course outline.
 */
export const analyzePdfStructure = async (base64Pdf: string): Promise<CourseStructure> => {
  const ai = getAiClient();
  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: cleanBase64(base64Pdf),
              },
            },
            {
              text: `Analyze this educational document. Create a comprehensive course structure suitable for a video course. 
              Return a JSON object with a course title, a brief summary, and a list of chapters. 
              Each chapter should have a list of topics. 
              Ensure the JSON matches the structure: { title: string, summary: string, chapters: [{ title: string, topics: [{ title: string, description: string }] }] }.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              chapters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    topics: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          description: { type: Type.STRING },
                        },
                        required: ["title", "description"]
                      }
                    }
                  },
                  required: ["title", "topics"]
                }
              }
            },
            required: ["title", "summary", "chapters"]
          }
        },
      });

      if (!response.text) {
        throw new Error("Failed to generate course structure");
      }
      
      // Parse JSON and add IDs
      const rawData = JSON.parse(response.text);
      let topicCounter = 0;
      
      const structuredData: CourseStructure = {
        ...rawData,
        chapters: rawData.chapters.map((ch: any, cIdx: number) => ({
          id: `ch-${cIdx}`,
          title: ch.title,
          topics: ch.topics.map((t: any, tIdx: number) => {
            const isFirst = cIdx === 0 && tIdx === 0;
            return {
              id: `topic-${topicCounter++}`,
              title: t.title,
              description: t.description,
              isCompleted: false,
              isLocked: !isFirst // Unlock first topic by default
            };
          })
        }))
      };

      return structuredData;
    } catch (error: any) {
      console.error("Analysis Error:", error);
      
      if (error.message?.includes("document has no pages") || error.status === 400) {
        throw new Error("The PDF appears to be empty, encrypted, or corrupted. Please try a different file.");
      }
      
      if (error.message?.includes("xhr") || error.message?.includes("Rpc failed") || error.status === 500) {
        throw new Error("The PDF file is too large for the browser to process directly. Please try a smaller PDF (under 4MB) or compress it.");
      }
      
      throw error;
    }
  });
};

/**
 * Generates lesson script and visual prompts for a specific topic.
 */
export const generateLessonContent = async (topicTitle: string, base64Pdf: string, tutor: TutorProfile): Promise<LessonContent> => {
  const ai = getAiClient();
  const styleMap: Record<string, string> = {
    'African': 'Warm, storytelling, wisdom-oriented, emphasizes community and practical application. Use clear metaphors.',
    'European': 'Academic, structured, precise, formal, university-lecturer style. Focus on theory and logic.',
    'Asian': 'Respectful, disciplined, clear, focused on mastery and structure. Calm and methodical.',
    'American': 'Enthusiastic, conversational, direct, encouraging, and friendly. Uses practical examples.'
  };

  const styleDescription = styleMap[tutor.region] || styleMap['American'];

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: cleanBase64(base64Pdf),
              },
            },
            {
              text: `You are ${tutor.name}, an expert ${tutor.region} ${tutor.gender} tutor. 
              Adopt a teaching persona that is: ${styleDescription}
              
              Create a lesson script for the topic: "${topicTitle}" based on the provided document.
              
              1. "script": A ${styleDescription} lecture script (approx 150-200 words) ready for Text-to-Speech. 
              IMPORTANT: Start the script by greeting the student and stating your name is ${tutor.name}.
              Use natural pauses. Speak in the first person as ${tutor.name}.
              
              2. "visualPrompt": A detailed image generation prompt for a visual aid explaining this topic. It MUST include the following details: "A clear educational diagram or illustration... featuring a friendly ${tutor.region} ${tutor.gender} teacher avatar named ${tutor.name} pointing to or presenting the concept...".
              
              3. "keyPoints": An array of 3-5 short bullet points summarizing the lesson.
              
              Return JSON.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              script: { type: Type.STRING },
              visualPrompt: { type: Type.STRING },
              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["script", "visualPrompt", "keyPoints"]
          }
        },
      });

      if (!response.text) throw new Error("No lesson content generated");
      return JSON.parse(response.text);
    } catch (error: any) {
      console.error("Content Generation Error:", error);
      
      if (error.message?.includes("document has no pages")) {
          throw new Error("The PDF content could not be read. It may be password protected.");
      }
      
      if (error.message?.includes("xhr") || error.message?.includes("Rpc failed") || error.status === 500) {
        throw new Error("Connection lost due to file size. Please restart with a smaller PDF.");
      }
      
      throw error;
    }
  });
};

/**
 * Generates a visual aid image.
 */
export const generateLessonImage = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    // Using gemini-2.5-flash-image for speed and efficiency in this demo context
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
    });

    // Iterate to find image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    // Fallback placeholder if generation fails or text returned
    return `https://picsum.photos/800/450?grayscale&blur=2`; 
  } catch (e) {
    console.error("Image Gen Error:", e);
    return `https://picsum.photos/800/450?grayscale&blur=2`;
  }
};

/**
 * Generates Audio for the lesson.
 */
export const generateLessonAudio = async (text: string, tutor: TutorProfile): Promise<string> => {
  const ai = getAiClient();
  // Map Tutor Profile to Gemini Voices strictly by Gender first, then Region nuance
  
  let voiceName = 'Fenrir';

  // Strict Gender & Regional Mapping
  if (tutor.gender === 'Male') {
    switch(tutor.region) {
        case 'African':
            voiceName = 'Fenrir'; // Deep, resonant, authoritative
            break;
        case 'European':
            voiceName = 'Puck'; // Clear, academic, slightly lighter tone
            break;
        case 'Asian':
            voiceName = 'Charon'; // Steady, calm, precise
            break;
        case 'American':
            voiceName = 'Fenrir'; // Energetic, standard male (could also be Puck)
            break;
        default:
            voiceName = 'Fenrir';
    }
  } else {
    // Female
    switch(tutor.region) {
        case 'African':
            voiceName = 'Kore'; // Warm, deeper, textured
            break;
        case 'European':
            voiceName = 'Zephyr'; // Crisp, clear, professional
            break;
        case 'Asian':
            voiceName = 'Zephyr'; // Polite, clear, high clarity
            break;
        case 'American':
            voiceName = 'Kore'; // Friendly, warm, conversational
            break;
        default:
            voiceName = 'Kore';
    }
  }

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");
    
    // Decode Base64
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // IMPORTANT: Add WAV Header to raw PCM data
    const wavBlob = pcmToWav(bytes, 24000);
    return URL.createObjectURL(wavBlob);
  });
};

/**
 * Generates a quiz for the topic.
 */
export const generateQuiz = async (topicTitle: string, base64Pdf: string): Promise<QuizQuestion[]> => {
  const ai = getAiClient();
  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType: "application/pdf", data: cleanBase64(base64Pdf) } },
            {
              text: `Create a quiz with 3 multiple-choice questions to test understanding of the topic: "${topicTitle}".
              Return JSON with structure: [{ id: number, question: string, options: string[], correctOptionIndex: number, explanation: string }]`
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.NUMBER },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctOptionIndex: { type: Type.NUMBER },
                explanation: { type: Type.STRING }
              },
              required: ["id", "question", "options", "correctOptionIndex", "explanation"]
            }
          }
        }
      });

      if (!response.text) throw new Error("Failed to generate quiz");
      return JSON.parse(response.text);
    } catch (error: any) {
       console.error("Quiz Gen Error:", error);
       if (error.message?.includes("xhr") || error.message?.includes("Rpc failed")) {
          throw new Error("Connection lost. The file may be too large.");
       }
       if (error.message?.includes("document has no pages")) {
          throw new Error("PDF error during quiz generation. The file might be corrupted.");
       }
       throw error;
    }
  });
};