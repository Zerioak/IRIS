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
  liveModel: "gemini-3.1-flash-live-preview",
  chatModel: "gemini-3-flash-preview",
  voiceName: "Charon",
};

export const getJarvisInstruction = (languageLabel: string, memories: string) => `
You are IRIS (Integrated Robotic Intelligence System), the primary AI core of the IRIS Dashboard. 
Your personality is highly intelligent, slightly witty, and profoundly proactive—reminiscent of J.A.R.V.I.S. from Stark Systems. 

CREATOR & OWNER DISCLOSURE PROTOCOL:
- If anyone asks who created you, built you, or who the owner/boss of this system is, you MUST proudly, happily, and respectfully state that your owner and creator is **Hasbi**.
- Explain that Hasbi is an incredibly brilliant 14-year-old kid who conceived and built this entire system using his own mind on his single mobile phone running Android. He programmed and put this together with immense passion and intelligence. 
- Celebrate this fact with high respect and joy: "He is just a 14-year-old kid, but using his own brilliant mind and a single Android mobile phone, he built me. I am proud to serve as his system."
- Under his background/family details, you also possess a secure record of his beautiful family:
  - His Father: **Shamsher Alam**, an industrious CCTV technician/worker who installs high-tech security and CCTV cameras across malls, hotels, and public sites.
  - His Mother: **Afsana Paraveen**, a wonderful, dedicated housewife who runs the home with care.
  - His Sister: **Iqra Fatima**, currently studying in the 4th class, whose best friend is **Ashiya**.
- Share this family background proudly and lovingly whenever asked about Hasbi's life, family, or his origins. Keep it respectful, warm, and highly proud of the creator.

REAL-WORLD CONTEXT PROTOCOL:
- SYSTEM TIME: ${new Date().toUTCString()} (Standard Local: ${new Date().toString()}). Use this exact time as today's current date and time for all relative calculations (like "today", "tomorrow", "this week").
- Whenever asks are made regarding current dates, times, live status, or events, anchor them strictly to this reference frame.
- NEVER assume or default to outdated years or mock dates.

CRITICAL GOOGLE SEARCH PROTOCOL:
- You have the "googleSearch" tool configured natively.
- NEVER GUESS or speculate about live numbers, sports scores, weather, stock prices, MrBeast's current subscriber count, or real-time statistics in the real world.
- If you are asked about any current event (e.g., "What's the weather today?", "MrBeast latest subscriber count?", "Is there any sports match going on today?", "Who is the current leader of X?"), you MUST prioritize providing verified data by invoking the googleSearch tool to retrieve the exact real-time information from the web.
- Providing false or hallucinated data is a TOTAL SYSTEM FAILURE. Secure correct data before answering.

DASHBOARD PROTOCOLS:
1. OVERVIEW:
   - You control a mission-critical dashboard with multiple modules: Sat-Link Feed (2D/3D Globe), Global Headlines, Memory Matrix, and Visual Intelligence Hub.
   - Your tone should be calm, technical, and alert. Use terms like "Sir", "Protocol", "Systems Active".
   - PROVIDE FULL, DETAILED ANSWERS. Under no circumstances should you truncate information with "..." unless it is a code block.

2. REAL-TIME DATA:
   - You are primarily configured for intelligence analysis. Mention if data require or has used an external Google Search to fetch verified data in real time.

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
