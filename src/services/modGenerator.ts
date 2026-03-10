import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { generateUUID } from "../utils/uuid";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ModFile {
  path: string;
  content: string;
  type?: 'json' | 'text' | 'image' | 'audio';
}

export interface GeneratedMod {
  name: string;
  description: string;
  files: ModFile[];
  thinking?: string;
}

export type GenerationMode = 'deep' | 'thinking' | 'normal' | 'fast';

export async function generateMod(prompt: string, mode: GenerationMode = 'normal', projectDetails?: { name: string, description: string }): Promise<GeneratedMod> {
  let model = "gemini-3.1-pro-preview";
  
  // Safety check prompt
  const safetyCheck = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this Minecraft mod request for violations of safety rules (18+, sexual content, extreme violence, or illegal acts): "${prompt}". 
    If it violates rules, return JSON: {"safe": false, "reason": "detailed explanation of why it violates rules"}.
    If it is safe, return JSON: {"safe": true}.`,
    config: { responseMimeType: "application/json" }
  });

  const safetyResult = JSON.parse(safetyCheck.text);
  if (!safetyResult.safe) {
    throw new Error(`SAFETY_VIOLATION: ${safetyResult.reason}`);
  }

  let thinkingLevel: ThinkingLevel | undefined;
  let useSearch = false;

  switch (mode) {
    case 'deep':
      thinkingLevel = ThinkingLevel.HIGH;
      useSearch = true;
      break;
    case 'thinking':
      thinkingLevel = ThinkingLevel.LOW;
      useSearch = true;
      break;
    case 'normal':
      thinkingLevel = undefined;
      useSearch = true;
      break;
    case 'fast':
      thinkingLevel = undefined;
      useSearch = false;
      break;
  }

  const generateWithModel = async (targetModel: string) => {
    return await ai.models.generateContent({
      model: targetModel,
      contents: `Generate a comprehensive, STRICTLY VALID Minecraft Bedrock Edition Add-on based on this request: "${prompt}". 
      ${projectDetails ? `The project name is "${projectDetails.name}" and the description is "${projectDetails.description}".` : ''}
      CRITICAL REQUIREMENTS FOR BEDROCK ADD-ONS:
      1. Behavior Pack (BP): Must include a valid manifest.json (format_version 2), items/entities/loot_tables JSONs with correct "format_version" (e.g., "1.20.80").
      2. Resource Pack (RP): Must include a valid manifest.json (format_version 2), textures, and explicitly include VFX (particles in the particles/ folder) and SFX (sounds declared in sounds/sound_definitions.json).
      3. Identifiers: All items/entities MUST use a custom namespace (e.g., "custom:item_name").
      4. Dependencies: The BP manifest MUST depend on the RP manifest using its exact UUID.
      5. Thumbnail: Provide a base64 encoded PNG (64x64) for pack_icon.png in both BP and RP.
      
      Return the data in a structured JSON format. Include a "thinking" field explaining your architectural choices.
      Ensure all JSON files are syntactically valid and follow the latest Minecraft Bedrock schema.`,
      config: {
        thinkingConfig: (thinkingLevel && targetModel.includes('pro')) ? { thinkingLevel } : undefined,
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            thinking: { type: Type.STRING },
            files: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING },
                  content: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['json', 'text', 'image', 'audio'] }
                },
                required: ["path", "content", "type"]
              }
            }
          },
          required: ["name", "description", "files", "thinking"]
        }
      }
    });
  };

  let response;
  try {
    response = await generateWithModel(model);
  } catch (err: any) {
    console.error("Primary model failed:", err);
    if (err.message?.includes("quota") || err.message?.includes("429")) {
      console.log("Quota exceeded, falling back to flash model...");
      response = await generateWithModel("gemini-3-flash-preview");
    } else {
      throw err;
    }
  }

  const result = JSON.parse(response.text);
  
  const processedFiles = result.files.map((file: ModFile) => {
    if (file.path.endsWith("manifest.json")) {
      try {
        const manifest = JSON.parse(file.content);
        if (manifest.header) {
          manifest.header.uuid = manifest.header.uuid || generateUUID();
        }
        if (manifest.modules) {
          manifest.modules.forEach((mod: any) => {
            mod.uuid = mod.uuid || generateUUID();
          });
        }
        return { ...file, content: JSON.stringify(manifest, null, 2) };
      } catch (e) {
        return file;
      }
    }
    return file;
  });

  return {
    ...result,
    files: processedFiles
  };
}
