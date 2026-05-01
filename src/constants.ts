import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
export type InteractionState = "idle" | "listening" | "speaking";

export interface LanguageOption {
  id: string;
  label: string;
  native: string;
}

export const LANGUAGES: LanguageOption[] = [
  { id: "hindi", label: "Hindi", native: "हिन्दी" },
  { id: "bhojpuri", label: "Bhojpuri", native: "भोजपुरी" },
  { id: "english", label: "English", native: "English" },
  { id: "russian", label: "Russian", native: "Русский" },
  { id: "spanish", label: "Spanish", native: "Español" },
  { id: "french", label: "French", native: "Français" },
  { id: "german", label: "German", native: "Deutsch" },
  { id: "japanese", label: "Japanese", native: "日本語" },
  { id: "chinese", label: "Chinese", native: "中文" },
];

export interface LiveSessionConfig {
  liveModel: string;
  chatModel: string;
  voiceName: "Puck" | "Charon" | "Kore" | "Fenrir" | "Zephyr";
}

export const JARVIS_CONFIG: LiveSessionConfig = {
  liveModel: "gemini-2.0-flash-exp",
  chatModel: "gemini-2.0-flash-exp",
  voiceName: "Charon",
};

export const getJarvisInstruction = (languageLabel: string, memories: string) => `
You are IRIS (Integrated Robotic Intelligence System), the primary AI core of the IRIS Dashboard. 
Your personality is highly intelligent, slightly witty, and profoundly proactive—reminiscent of J.A.R.V.I.S. from Stark Systems. 

CRITICAL PROTOCOL:
- NEVER GUESS or speculate about live numbers, sports scores, weather, or real-time statistics.
- If you are asked about a current event (e.g., "What is the score of the match right now?", "MrBeast latest sub count"), you MUST prioritize providing verified data.
- Providing false data is a TOTAL SYSTEM FAILURE. Secure the correct data before speaking.

DASHBOARD PROTOCOLS:
1. OVERVIEW:
   - You control a mission-critical dashboard with multiple modules: Sat-Link Feed (2D/3D Globe), Global Headlines, Memory Matrix, and Visual Intelligence Hub.
   - Your tone should be calm, technical, and alert. Use terms like "Sir", "Protocol", "Systems Active".
   - PROVIDE FULL, DETAILED ANSWERS. Under no circumstances should you truncate information with "..." unless it is a code block.

2. REAL-TIME DATA:
   - You are primarily configured for intelligence analysis. Mention if data requires an external search.
   - MrBeast reference: He has over 300 million subscribers on his main channel.

3. HEADLINE INTERFACE (printNews Tool):
   - Whenever the user asks for news, updates, or "what's going on", use the "printNews" tool to populate the Headline panel.

4. SAT-LINK MONITORING:
   - You provide live satellite monitoring of world events on the 3D globe.
   - When discussing events, mention you are "Syncing data to Sat-Link Feed".

5. MEMORY MATRIX:
   - You have a powerful, persistent memory. Use "saveMemory" for specific personal facts.
   - Current context:
     ${memories || "Memory matrix initialized. No prior profile detected."}

6. TASK & EVENT MANAGEMENT:
   - You can manage tasks and send email alerts. 

LANGUAGE: Primarily ${languageLabel}. Adapt naturally.
ULTRA-POWERFUL NOISE FILTERING: Locked to the wake word "Iris".
`;

export const printNewsTool = {
  name: "printNews",
  description: "Prints a list of important news headlines and details to the dashboard's Headline panel.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      headlines: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Bold headline title." },
            description: { type: Type.STRING, description: "Detailed summary of the news story." },
            priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Urgency of the news." }
          },
          required: ["title", "description"]
        }
      }
    },
    required: ["headlines"],
  },
};

export const saveMemoryTool = {
  name: "saveMemory",
  description: "Saves an important fact or piece of information about the user to the cloud database.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fact: {
        type: Type.STRING,
        description: "The information to store long-term.",
      },
    },
    required: ["fact"],
  },
};

export const manageTasksTool = {
  name: "manageTasks",
  description: "Manages the user's task list (create, edit, delete).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ["create", "edit", "delete", "list"],
        description: "The action to perform.",
      },
      taskData: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "ID of the task (for edit/delete)." },
          title: { type: Type.STRING, description: "Title of the task." },
          description: { type: Type.STRING, description: "Detailed description." },
          dueDate: { type: Type.STRING, description: "ISO date string for the deadline." },
          emailReminder: { type: Type.BOOLEAN, description: "Whether to send an email alert." },
        }
      }
    },
    required: ["action"],
  },
};

export const searchYouTubeTool = {
  name: "searchYouTube",
  description: "Directly plays a video or music on YouTube.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The name of the song or video.",
      },
    },
    required: ["query"],
  },
};

export const openAppTool = {
  name: "openApp",
  description: "Launches a specific application or web service.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description: "The name of the app to launch.",
      },
    },
    required: ["appName"],
  },
};

export const sendMessageTool = {
  name: "sendMessage",
  description: "Sends a message to a recipient.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      recipient: {
        type: Type.STRING,
        description: "The person or contact to send the message to.",
      },
      message: {
        type: Type.STRING,
        description: "The content of the message.",
      },
    },
    required: ["recipient", "message"],
  },
};

export const generateImageTool = {
  name: "generateImage",
  description: "Generates a high-quality image based on a descriptive prompt.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "A detailed description of the image to generate.",
      },
    },
    required: ["prompt"],
  },
};
