import React, { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { Mic, Loader2, AlertCircle, Video, VideoOff, MessageSquare, PhoneOff, ChevronDown, Languages, RefreshCw, X, Monitor, MonitorOff, Globe, Newspaper, Zap, Cpu, Database, Settings, Power, Activity, Terminal, ShieldAlert, Layers, Map as MapIcon, Plus, Trash2, History } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AudioStreamer } from "./lib/audio";
import { Waveform } from "./components/Waveform";
import { IrisCore } from "./components/IrisCore";
import { SatelliteFeed } from "./components/SatelliteFeed";
import { JARVIS_CONFIG, ConnectionState, InteractionState, LANGUAGES, getJarvisInstruction, saveMemoryTool, manageTasksTool, searchYouTubeTool, openAppTool, printNewsTool } from "./constants";

const openWebsiteTool = {
  name: "openWebsite",
  description: "Opens a specific website URL in a new tab for the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL of the website to open (e.g., https://google.com)",
      },
    },
    required: ["url"],
  },
};

interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: number;
  image?: string;
}

export default function App() {
  const [isClient, setIsClient] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("disconnected");
  const [interactionStatus, setInteractionStatus] = useState<InteractionState>("idle");
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [memories, setMemories] = useState<string[]>([]);
  const [error, setError] = useState<{ message: string; type?: "screen-share" } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
  const [workerStatus, setWorkerStatus] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [cloudMemories, setCloudMemories] = useState<{ id: string; content: string; timestamp: string }[]>([]);
  const [logs, setLogs] = useState<{ type: string; message: string; timestamp: number }[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState("");
  const [headlines, setHeadlines] = useState<{ title: string; description: string; priority?: string }[]>([
    { title: "LLM ECOSYSTEM SHOWS EXPLOSIVE GROWTH", description: "Large Language Model ecosystem is booming, now featuring over 500 models from OpenAI, Anthropic, Google, and Meta." },
    { title: "XIAOMI AND ANONYMOUS AI MODELS SURGE", description: "Xiaomi's open-source model reported to surpass Claude Opus, while anonymous 'Happy Horse' leads in AI video." },
    { title: "RUMORS POINT TO AGENTIC GPT-5.5", description: "Speculation mounts around OpenAI's potential GPT-5.5 release, rumored to be their most capable agentic model." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [traditionalMessages, setTraditionalMessages] = useState<ChatMessage[]>([]);
  const [isTraditionalChatLoading, setIsTraditionalChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "logs" | "notes" | "tasks">("chats");

  const sessionRef = useRef<any>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const stopMediaRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isMicMutedRef = useRef(false);
  const interactionStatusRef = useRef<InteractionState>("idle");

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    interactionStatusRef.current = interactionStatus;
  }, [interactionStatus]);

  // Load memories on mount
  useEffect(() => {
    const saved = localStorage.getItem("iris_memories");
    if (saved) {
      try {
        setMemories(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse memories", e);
      }
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, showChat]);

  const saveToLocalStorage = (newFact: string) => {
    setMemories(prev => {
      const updated = [...prev, newFact];
      localStorage.setItem("iris_memories", JSON.stringify(updated));
      return updated;
    });
  };

  // Dashboard Protocol Logic
  useEffect(() => {
    fetchMemories();
    addLog("system", "Mission Control Dashboard Initialized.");
  }, []);

  const fetchMemories = async () => {
    try {
      const res = await fetch("/api/memories");
      const data = await res.json();
      setCloudMemories(data);
    } catch (e) {
      console.error("Failed to load memories", e);
    }
  };

  const addManualMemory = async () => {
    if (!newMemoryInput.trim()) return;
    try {
      await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMemoryInput })
      });
      setNewMemoryInput("");
      fetchMemories();
      addLog("system", "Manual memory entry synchronized to Cloud Matrix.");
    } catch (e) {
      addLog("error", "Memory synchronization failed.");
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      await fetch(`/api/memories/${id}`, { method: "DELETE" });
      fetchMemories();
      addLog("system", "Memory unit purged from primary matrix.");
    } catch (e) {
      addLog("error", "Failed to purge memory unit.");
    }
  };

  const addLog = (type: string, message: string) => {
    setLogs(prev => [{ type, message, timestamp: Date.now() }, ...prev].slice(0, 50));
  };

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    audioStreamerRef.current?.stopRecording();
    audioStreamerRef.current?.stopAll();
    if (stopMediaRef.current) {
      stopMediaRef.current();
      stopMediaRef.current = null;
    }
    setVideoStream(null);
    setScreenStream(null);
    setIsCameraOn(false);
    setIsScreenSharing(false);
    setConnectionStatus("disconnected");
    setInteractionStatus("idle");
  }, []);

  const connect = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      setError(null);

      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : null);
      if (!apiKey) {
        throw new Error("API Key is missing.");
      }

      // Fetch long-term memories from Cloud Matrix (Backend API)
      let cloudMemories = "";
      try {
        const memoryRes = await fetch("/api/memories");
        const memoryData = await memoryRes.json();
        cloudMemories = memoryData.slice(0, 10).map((m: any) => m.content).join("\n");
      } catch (e) {
        console.error("Failed to fetch cloud memories", e);
      }

      const ai = new GoogleGenAI({ apiKey });
      
      audioStreamerRef.current = new AudioStreamer(24000);
      await audioStreamerRef.current.initialize();

      const memoryString = memories.map(m => `- ${m}`).join("\n") + "\n" + cloudMemories;

      const session = await ai.live.connect({
        model: JARVIS_CONFIG.liveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: JARVIS_CONFIG.voiceName } },
          },
          systemInstruction: getJarvisInstruction(selectedLanguage.label, memoryString),
          tools: [
            { functionDeclarations: [saveMemoryTool, manageTasksTool, searchYouTubeTool, openAppTool, printNewsTool, openWebsiteTool] }
          ],
        } as any,
        callbacks: {
          onopen: () => {
            setConnectionStatus("connected");
            setInteractionStatus("listening");
            audioStreamerRef.current?.startRecording((base64) => {
              // Auto-mute logic: Only send audio if not manually muted AND IRIS is not speaking
              if (!isMicMutedRef.current && interactionStatusRef.current !== "speaking") {
                session.sendRealtimeInput({
                  audio: { data: base64, mimeType: "audio/pcm;rate=16000" },
                });
              }
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            // Log raw message to console for debugging protocols
            console.log("[PROTOCOL DATA RECEIVED]", message);

            // Capture transcript parts
            if (message.serverContent?.modelTurn?.parts) {
              const textPart = message.serverContent.modelTurn.parts.find(p => p.text);
              if (textPart?.text) {
                const updater = (prev: ChatMessage[]) => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === "model" && Date.now() - last.timestamp < 5000) {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...last, text: last.text + textPart.text! };
                    return updated;
                  }
                  return [...prev, { role: "model" as const, text: textPart.text!, timestamp: Date.now() }];
                };
                setTranscript(updater);
                setTraditionalMessages(updater);
              }

              const audioPart = message.serverContent.modelTurn.parts.find(p => p.inlineData);
              if (audioPart?.inlineData?.data) {
                setInteractionStatus("speaking");
                await audioStreamerRef.current?.playChunk(audioPart.inlineData.data);
              }
            }

            if (message.serverContent?.interrupted) {
              // Interruption logic: Stop audio immediately
              audioStreamerRef.current?.stopAll();
              await audioStreamerRef.current?.initialize();
              setInteractionStatus("listening");
            }

            if (message.serverContent?.turnComplete) {
              setInteractionStatus("listening");
            }

            if (message.toolCall) {
              const { functionCalls } = message.toolCall;
              const functionResponses = [];

              for (const call of functionCalls) {
                setWorkerStatus(`DISPATCHING WORKER: ${call.name.toUpperCase()}`);
                addLog("protocol", `Executing tool: ${call.name}`);
                if (call.name === "printNews") {
                  const news = (call.args as any).headlines;
                  if (Array.isArray(news)) {
                    setHeadlines(news);
                  }
                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result: "News headlines updated on dashboard." },
                  });
                } else if (call.name === "saveMemory") {
                  const fact = (call.args as any).fact;
                  if (typeof fact === "string") {
                    fetch("/api/memories", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: fact })
                    }).then(() => fetchMemories());
                  }
                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result: "Memory updated in cloud matrix." },
                  });
                } else if (call.name === "openWebsite") {
                  const url = (call.args as any).url;
                  if (typeof url === "string") {
                    addLog("system", `Opening neural link to: ${url}`);
                    window.open(url, "_blank");
                  }
                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result: "Website opened successfully." },
                  });
                } else if (call.name === "manageTasks") {
                  const { action, taskData } = call.args as any;
                  let result = "";
                  
                  if (action === "create") {
                    await fetch("/api/tasks", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(taskData)
                    });
                    result = "Task created and synced with Stark Cloud.";
                    
                    if (taskData.emailReminder) {
                      try {
                        await fetch("/api/send-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: taskData.title,
                            description: taskData.description || "No description",
                            dueDate: taskData.dueDate
                          })
                        });
                        result += " Reminder system engaged.";
                      } catch (e) {
                        console.error("Email send failed", e);
                        result += " (Note: Alert system delayed).";
                      }
                    }
                  } else if (action === "list") {
                    const res = await fetch("/api/tasks");
                    const taskList = await res.json();
                    setTasks(taskList);
                    functionResponses.push({
                      name: call.name,
                      id: call.id,
                      response: { tasks: taskList },
                    });
                    continue; // Skip the generic push
                  }
                  
                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result },
                  });
                } else if (call.name === "searchYouTube") {
                  const query = (call.args as any).query;
                  if (typeof query === "string") {
                    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank");
                  }
                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result: `Searching YouTube for ${query}` },
                  });
                } else if (call.name === "searchKnowledge") {
                  const query = (call.args as any).query;
                  if (typeof query === "string") {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
                  }
                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result: `Searching knowledge base for ${query}` },
                  });
                } else if (call.name === "openApp") {
                  const appName = (call.args as any).appName.toLowerCase();
                  let url = "";
                  if (appName.includes("whatsapp")) url = "https://web.whatsapp.com";
                  else if (appName.includes("gmail")) url = "https://mail.google.com";
                  else if (appName.includes("facebook")) url = "https://facebook.com";
                  else if (appName.includes("instagram")) url = "https://instagram.com";
                  else if (appName.includes("twitter") || appName.includes(" x ")) url = "https://x.com";
                  else url = `https://www.google.com/search?q=${encodeURIComponent(appName)}`;

                  window.open(url, "_blank");
                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result: `Opening ${appName}` },
                  });
                } else if (call.name === "sendMessage") {
                  const { recipient, message } = call.args as any;
                  // Fallback to WhatsApp web with pre-filled message
                  window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank");
                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result: `Preparing to send message to ${recipient}` },
                  });
                } else if (call.name === "generateImage") {
                  const prompt = (call.args as any).prompt;
                  const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;
                  
                  setTranscript(prev => [...prev, { 
                    role: "model", 
                    text: `Generating image for: "${prompt}"`, 
                    timestamp: Date.now(),
                    image: imageUrl
                  }]);

                  functionResponses.push({
                    name: call.name,
                    id: call.id,
                    response: { result: "Image generated successfully and displayed to the user." },
                  });
                }
              }

              if (functionResponses.length > 0) {
                session.sendToolResponse({ functionResponses });
                // protocol: clear worker status after response dispatch
                setTimeout(() => setWorkerStatus(null), 3000);
              }
            }
          },
          onerror: (err: any) => {
            console.error("IRIS Deep System Error:", err);
            const errorMsg = err?.message || "Protocol level interruption";
            setError({ message: `Connection failed: ${errorMsg}. Please verify your region and internet integrity.` });
            disconnect();
          },
          onclose: () => {
            setConnectionStatus("disconnected");
            setInteractionStatus("idle");
          },
        },
      });

      sessionRef.current = session;
    } catch (err) {
      console.error("Failed to connect:", err);
      setError({ message: "Failed to initialize." });
      setConnectionStatus("disconnected");
    }
  }, [memories, selectedLanguage, disconnect]);

  const openInNewTab = () => {
    window.open(window.location.href, "_blank");
  };

  const handleTraditionalChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTraditionalChatLoading) return;

    const userText = chatInput.trim();
    const userMsg: ChatMessage = { role: "user", text: userText, timestamp: Date.now() };
    setTraditionalMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsTraditionalChatLoading(true);
    addLog("user", "Instruction received: " + userText.substring(0, 30) + "...");

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : null);
      if (!apiKey) throw new Error("API Key missing");
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Fetch memories for context (same as voice)
      let cloudText = "";
      try {
        const memoryRes = await fetch("/api/memories");
        const memoryData = await memoryRes.json();
        cloudText = memoryData.slice(0, 10).map((m: any) => m.content).join("\n");
      } catch (e) {
        console.error("Failed to fetch cloud memories for chat", e);
      }
      const memoryString = memories.map(m => `- ${m}`).join("\n") + "\n" + cloudText;

      const contents = [
        ...traditionalMessages.slice(-10).map(m => ({ 
          role: m.role === "user" ? "user" : "model", 
          parts: [{ text: m.text }] 
        })), 
        { role: "user", parts: [{ text: userText }] }
      ];

      const response = await ai.models.generateContent({
        model: JARVIS_CONFIG.chatModel,
        contents,
        config: {
          systemInstruction: getJarvisInstruction(selectedLanguage.label, memoryString),
          tools: [
            { functionDeclarations: [saveMemoryTool, manageTasksTool, searchYouTubeTool, openAppTool, printNewsTool, openWebsiteTool] }
          ]
        } as any
      });
      const text = response.text || "Communication blackout detected. Check connection.";

      const modelMsg: ChatMessage = { 
        role: "model", 
        text, 
        timestamp: Date.now() 
      };
      setTraditionalMessages(prev => [...prev, modelMsg]);
      addLog("model", "Instruction processed by core.");
    } catch (err: any) {
      console.error("Traditional Chat Error:", err);
      addLog("error", "Protocol error: " + err.message);
      setTraditionalMessages(prev => [...prev, { 
        role: "model", 
        text: "Communication blackout detected. Check connection.", 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsTraditionalChatLoading(false);
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      stopMediaRef.current?.();
      stopMediaRef.current = null;
      setVideoStream(null);
      setIsCameraOn(false);
    } else {
      if (audioStreamerRef.current) {
        const result = await audioStreamerRef.current.startVideo((base64) => {
          sessionRef.current?.sendRealtimeInput({
            video: { data: base64, mimeType: "image/jpeg" }
          });
        }, facingMode);
        if (result) {
          stopMediaRef.current = result.stop;
          setVideoStream(result.stream);
          setIsCameraOn(true);
        }
      }
    }
  };

  const setCameraMode = async (mode: "user" | "environment") => {
    if (facingMode === mode && isCameraOn) return;
    
    setFacingMode(mode);
    if (isCameraOn) {
      stopMediaRef.current?.();
      if (audioStreamerRef.current) {
        const result = await audioStreamerRef.current.startVideo((base64) => {
          sessionRef.current?.sendRealtimeInput({
            video: { data: base64, mimeType: "image/jpeg" }
          });
        }, mode);
        if (result) {
          stopMediaRef.current = result.stop;
          setVideoStream(result.stream);
        }
      }
    } else {
      if (audioStreamerRef.current) {
        const result = await audioStreamerRef.current.startVideo((base64) => {
          sessionRef.current?.sendRealtimeInput({
            video: { data: base64, mimeType: "image/jpeg" }
          });
        }, mode);
        if (result) {
          stopMediaRef.current = result.stop;
          setVideoStream(result.stream);
          setIsCameraOn(true);
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach(track => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    } else {
      try {
        // Check if the API exists
        const mediaDevices = navigator.mediaDevices as any;
        const getDisplayMedia = mediaDevices?.getDisplayMedia?.bind(mediaDevices) || 
                           (navigator as any).getDisplayMedia?.bind(navigator) ||
                           (navigator as any).webkitGetDisplayMedia?.bind(navigator) ||
                           (navigator as any).mozGetDisplayMedia?.bind(navigator);

        if (!getDisplayMedia) {
          setError({ 
            message: "Screen sharing is blocked by the browser in this view. Please open the app in a new tab to use this feature.",
            type: "screen-share"
          });
          return;
        }

        const stream = await getDisplayMedia({
          video: { frameRate: 10 },
          audio: false
        });
        
        setScreenStream(stream);
        setIsScreenSharing(true);

        // Create a hidden video element to capture frames
        const hiddenVideo = document.createElement('video');
        hiddenVideo.srcObject = stream;
        hiddenVideo.play();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const sendFrame = async () => {
          if (stream.active && hiddenVideo.readyState >= 2) {
            try {
              canvas.width = hiddenVideo.videoWidth;
              canvas.height = hiddenVideo.videoHeight;
              ctx?.drawImage(hiddenVideo, 0, 0);
              const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
              
              sessionRef.current?.sendRealtimeInput({
                video: { data: base64, mimeType: "image/jpeg" }
              });
              
              if (stream.active) {
                setTimeout(sendFrame, 1000); // Send frame every 1 second for screen share
              }
            } catch (e) {
              console.error("Screen frame capture failed", e);
            }
          } else if (stream.active) {
            setTimeout(sendFrame, 500);
          }
        };

        sendFrame();

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          hiddenVideo.srcObject = null;
        };
      } catch (err: any) {
        console.error("Failed to start screen share:", err);
        setError({ 
          message: err.message || "Failed to start screen share.",
          type: "screen-share"
        });
      }
    }
  };

  if (!isClient) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-blue-500 font-mono">INITIALIZING IRIS CORE...</div>;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#8ea8c3] flex flex-col font-sans overflow-hidden selection:bg-blue-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-teal-600/20 rounded-full blur-[150px]" />
      </div>

      {/* Main Grid Layout */}
      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-[300px_1fr_400px] lg:grid-rows-[1fr_400px] gap-4 p-4 z-10 overflow-y-auto lg:overflow-hidden">
        
        {/* Left Column: Media & Sat-Link */}
        <div className="flex flex-col gap-4 order-2 lg:order-1">
          {/* Media Link Panel */}
          <div className="bg-[#0a0f14]/80 border border-[#1e3a5f]/40 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#567a9b]">Media Link</span>
              </div>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
                <div className="w-1 h-1 bg-red-500 rounded-full" />
              </div>
            </div>
            <div className="aspect-video bg-black/40 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden group">
              {videoStream || screenStream ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`} 
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
                  <Layers className="w-8 h-8 text-white/10 group-hover:text-blue-500/20 transition-colors" />
                  <span className="text-[10px] font-mono text-white/30 uppercase mt-12 bg-black/40 px-2 py-1 rounded">System Offline</span>
                </>
              )}
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button onClick={toggleCamera} className="p-1.5 bg-white/5 hover:bg-blue-500/20 rounded-lg transition-colors border border-white/10">
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                </button>
                <button onClick={toggleScreenShare} className="p-1.5 bg-white/5 hover:bg-blue-500/20 rounded-lg transition-colors border border-white/10">
                  <Monitor className="w-3.5 h-3.5 text-blue-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Sat-Link Feed Panel */}
          <div className="flex-1 bg-[#0a0f14]/80 border border-[#1e3a5f]/40 rounded-2xl p-4 flex flex-col gap-3 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-400" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#567a9b]">Sat-Link Feed</span>
              </div>
              <span className="text-[9px] font-mono text-green-500/80 animate-pulse">LIVE FEED // OSCAR-9</span>
            </div>
            
            <div className="flex-1 bg-[#0a0f12] rounded-xl border border-white/5 relative overflow-hidden flex flex-col group">
              <SatelliteFeed />
            </div>

            {/* Headlines Section */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Newspaper className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#567a9b]">Today Headlines</span>
              </div>
              <div className="flex flex-col gap-4 max-h-[150px] overflow-y-auto custom-scrollbar pr-2">
                {headlines.map((hl, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="flex flex-col gap-1 group cursor-default"
                  >
                    <h3 className={`text-[10px] font-black leading-tight tracking-wider transition-colors ${hl.priority === 'high' ? 'text-red-500' : 'text-blue-400 group-hover:text-blue-300'}`}>
                      {hl.title}
                    </h3>
                    <p className="text-[9px] text-[#567a9b] leading-relaxed line-clamp-2">
                      {hl.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>


        {/* Center Section: Core & Visualization */}
        <div className="flex flex-col gap-4 relative order-1 lg:order-2 min-h-[500px]">
          
          {/* Top Panel: Core Orb Controls */}
          <div className="flex-1 bg-transparent relative flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-0">
            
            {/* Connection Lines (SVG) - Responsive Visibility */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <g className="opacity-40">
                <motion.path d="M 120,180 Q 240,180 350,250" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" animate={{ strokeDashoffset: [100, 0] }} strokeDasharray="100" transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
                <motion.path d="M 120,260 Q 240,260 350,250" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" animate={{ strokeDashoffset: [100, 0] }} strokeDasharray="100" transition={{ duration: 3, repeat: Infinity, delay: 0.7, ease: "linear" }} />
                <motion.path d="M 120,340 Q 240,340 350,250" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" animate={{ strokeDashoffset: [100, 0] }} strokeDasharray="100" transition={{ duration: 3, repeat: Infinity, delay: 1.4, ease: "linear" }} />
              </g>
            </svg>

            {/* Interaction Nodes (Left - Responsive) */}
            <div className="flex lg:flex-col gap-3 lg:gap-4 z-20 lg:absolute lg:left-0 overflow-x-auto lg:overflow-visible w-full lg:w-auto px-4 lg:px-0 no-scrollbar">
              {[
                { id: "mem", icon: Database, label: "Memory", color: "text-emerald-500", border: "border-emerald-500/20" },
                { id: "soul", icon: Zap, label: "Soul", color: "text-purple-400", border: "border-purple-400/20" },
                { id: "skills", icon: Cpu, label: "Skills", color: "text-blue-400", border: "border-blue-400/20" },
                { id: "set", icon: Settings, label: "Settings", color: "text-rose-500", border: "border-rose-500/20" }
              ].map((node) => (
                <div key={node.id} className={`flex-shrink-0 w-[140px] md:w-[160px] h-12 bg-black/40 border ${node.border} rounded-xl flex items-center gap-3 px-4 backdrop-blur-xl transition-all shadow-sm shadow-black/20`}>
                  <node.icon className={`w-4 h-4 ${node.color}`} />
                  <span className="text-[9px] font-mono uppercase tracking-widest text-white/60">{node.label}</span>
                  <div className="ml-auto w-1 h-1 rounded-full bg-white/20" />
                </div>
              ))}
            </div>


            {/* Central Core Orb - Responsive Sizing */}
            <div className="relative w-full max-w-[550px] aspect-square flex items-center justify-center p-4">
              {/* Outer Rings */}
              <div className="absolute inset-0 rounded-full border border-blue-500/5 animate-spin-slow" />
              
              {/* Core Visualization - Optimized for performance */}
              <div className="w-full h-full flex flex-col items-center justify-center border border-white/5 rounded-[40px] bg-[#0c1219]/90 backdrop-blur-3xl relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
                
                {/* Worker Status Overlay */}
                <AnimatePresence>
                  {workerStatus && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.1, y: -10 }}
                      className="absolute top-10 inset-x-0 flex flex-col items-center gap-4 z-30"
                    >
                      <div className="flex flex-col items-center gap-2 bg-blue-600/20 px-8 py-4 rounded-3xl border border-blue-500/30 backdrop-blur-2xl shadow-[0_0_40px_rgba(30,58,138,0.4)]">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                          <span className="text-[11px] font-mono text-blue-400 uppercase tracking-[0.3em] font-bold">{workerStatus}</span>
                        </div>
                      </div>
                      
                      {/* Sub-agent "Worker" message */}
                      <motion.div 
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-[9px] font-mono text-white/40 uppercase tracking-widest"
                      >
                        Analyzing neural stream...
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute top-[20%] text-center">
                   <div className="text-[10px] font-mono text-cyan-400/80 uppercase tracking-[0.4em] mb-4">Neural Signal: Latency 14ms</div>
                </div>

                <div className="absolute inset-0 z-10">
                  <IrisCore 
                    isSpeaking={interactionStatus === "speaking"} 
                    isListening={interactionStatus === "listening" && connectionStatus === "connected"} 
                  />
                </div>

                <div className="absolute bottom-[13%] flex flex-col items-center gap-6 p-6 w-full z-20">
                  <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-[0.3em] font-black border-y border-cyan-400/20 py-2 w-48 text-center bg-cyan-400/5">
                    • SYSTEM ACTIVE •
                  </div>
                  
                  <div className="flex gap-4 w-full justify-center">
                    <button 
                      onClick={connectionStatus === "connected" ? disconnect : connect}
                      className={`px-12 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${
                        connectionStatus === "connected" 
                          ? "bg-red-950/40 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white" 
                          : "bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                      }`}
                    >
                      {connectionStatus === "connected" ? "Terminate" : "Initialize"}
                    </button>
                    
                    <button 
                      onClick={() => setIsMicMuted(!isMicMuted)}
                      className={`p-3 rounded-2xl border transition-all ${isMicMuted ? "bg-red-950/40 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-blue-950/40 border-blue-500/30 text-blue-400"}`}
                    >
                      {isMicMuted ? <ShieldAlert className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Particle background removed for performance optimization */}
              </div>
            </div>
          </div>

          {/* Bottom Panel: Visual Hub */}
          <div className="h-[350px] bg-[#0a0f14]/80 border border-[#1e3a5f]/40 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-4 overflow-hidden relative group">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <span className="text-[11px] uppercase font-mono tracking-[0.3em] text-white">Visual Intelligence Hub</span>
              </div>
              <div className="flex gap-2">
                <button className="p-1 px-3 bg-white/5 rounded text-[8px] font-mono text-blue-400/60 uppercase">Ready</button>
                <button className="p-1 bg-white/5 rounded hover:bg-white/10 transition-colors">
                  <RefreshCw className="w-3 h-3 text-white/40" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 relative">
              {/* Central Graph/Logic View */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 group-hover:opacity-10 transition-opacity">
                <Database className="w-48 h-48 text-blue-500" />
              </div>
              
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="flex gap-8 items-center">
                  <div className="grid grid-cols-3 gap-2">
                    {["FLOWCHART", "MINDMAP", "SEQUENCE", "ER"].map(label => (
                      <div key={label} className="px-3 py-1 border border-white/10 rounded text-[7px] font-mono text-blue-400/40 uppercase tracking-widest">{label}</div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-xl font-bold tracking-tight text-white/90">VISUAL INTELLIGENCE HUB</h4>
                  <p className="text-[10px] text-blue-400/60 font-mono italic">Ask IRIS to generate a diagram, knowledge map, or analysis report.</p>
                </div>
                <div className="mt-4 flex gap-1">
                  <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                </div>
                <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">System Ready // Awaiting Input</span>
              </div>
            </div>
            
            {/* HUD Scan Effect */}
            <div className="absolute top-0 left-0 w-16 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent -translate-x-full animate-scan-x" />
          </div>
        </div>

        {/* Right Column: Interaction Systems */}
        <div className="flex flex-col gap-4 bg-[#0a0f12]/95 border-l border-[#1e3a5f]/40 rounded-l-3xl p-6 backdrop-blur-3xl shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
          
          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-white/5 pb-4">
            {["chats", "logs", "notes", "tasks"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-[10px] uppercase font-mono tracking-widest transition-all relative pb-2 ${activeTab === tab ? "text-blue-400" : "text-[#567a9b] hover:text-white"}`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="tabLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                )}
              </button>
            ))}
          </div>

          {/* Active Content Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pt-4">
            <AnimatePresence mode="wait">
              {activeTab === "chats" && (
                <motion.div 
                  key="chats"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-6"
                >
                  {traditionalMessages.length === 0 ? (
                    <div className="h-[500px] flex flex-col items-center justify-center text-center px-10 gap-6 opacity-30 grayscale">
                      <Terminal className="w-12 h-12 text-blue-500 mb-2" />
                      <div className="flex flex-col gap-2">
                        <h3 className="text-white text-xs uppercase tracking-[0.2em] font-mono">Input Terminal Locked</h3>
                        <p className="text-[9px] text-[#567a9b] leading-relaxed uppercase tracking-tighter">Enter secure encryption phrase below or activate voice protocols.</p>
                      </div>
                    </div>
                  ) : (
                    traditionalMessages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                          msg.role === "user" 
                            ? "bg-blue-600/10 text-white border border-blue-500/20 rounded-tr-none" 
                            : "bg-[#161b22]/50 text-neutral-300 border border-white/5 rounded-tl-none font-sans"
                        }`}>
                          {msg.text}
                          {msg.image && (
                            <div className="mt-3 rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                              <img src={msg.image} alt="Generated" className="w-full object-cover" />
                            </div>
                          )}
                        </div>
                        <span className="text-[8px] font-mono text-[#567a9b] mt-2 uppercase tracking-tighter opacity-50 px-2 italic">
                          {msg.role === "user" ? "Protocol: User" : "Protocol: IRIS"} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                  {isTraditionalChatLoading && (
                    <div className="flex gap-2 items-center text-blue-400 font-mono text-[9px] uppercase tracking-widest bg-blue-500/5 p-2 rounded-lg border border-blue-500/20 w-fit">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Decrypting Signal...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </motion.div>
              )}

              {activeTab === "logs" && (
                <motion.div 
                  key="logs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-2"
                >
                   {logs.map((log, i) => (
                     <div key={i} className="flex gap-3 items-start border-b border-white/5 pb-2">
                        <span className="text-[8px] font-mono opacity-30 mt-1 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div className="flex flex-col gap-1">
                           <span className={`text-[8px] font-mono uppercase tracking-widest ${log.type === 'protocol' ? 'text-blue-400' : 'text-teal-400'}`}>[{log.type}]</span>
                           <p className="text-[10px] leading-relaxed text-[#8ea8c3]">{log.message}</p>
                        </div>
                     </div>
                   ))}
                </motion.div>
              )}

              {activeTab === "notes" && (
                <motion.div 
                  key="notes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4"
                >
                   <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-white/40 uppercase font-mono text-[9px] tracking-widest">
                         <Database className="w-3 h-3" />
                         Store New Memory
                      </div>
                      <div className="flex gap-2">
                         <input 
                           value={newMemoryInput}
                           onChange={(e) => setNewMemoryInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && addManualMemory()}
                           placeholder="Enter fact to remember..." 
                           className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:border-blue-500/50"
                         />
                         <button 
                           onClick={addManualMemory}
                           className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all"
                         >
                            <Plus className="w-4 h-4" />
                         </button>
                      </div>
                   </div>

                   <div className="flex flex-col gap-2 mt-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                         <span className="text-[9px] uppercase font-mono tracking-widest text-[#567a9b]">Memory Matrix (Last 10)</span>
                         <RefreshCw onClick={fetchMemories} className="w-3 h-3 text-[#567a9b] cursor-pointer hover:rotate-180 transition-transform" />
                      </div>
                      {cloudMemories.length === 0 ? (
                         <span className="text-[9px] font-mono text-center py-10 opacity-30 italic">No stored matrix data.</span>
                      ) : (
                        cloudMemories.slice(0, 10).map((m, i) => (
                          <div key={i} className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl group relative overflow-hidden">
                             <p className="text-[10px] leading-relaxed italic">"{m.content}"</p>
                             <div className="text-[8px] font-mono text-[#567a9b] mt-2 opacity-50">{new Date(m.timestamp).toLocaleDateString()}</div>
                             <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 
                                  onClick={() => deleteMemory(m.id)}
                                  className="w-3 h-3 text-red-500/60 cursor-pointer hover:text-red-500" 
                                />
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </motion.div>
              )}

              {activeTab === "tasks" && (
                <motion.div 
                  key="tasks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex flex-col gap-4">
                     {tasks.length === 0 ? (
                        <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                           <Layers className="w-10 h-10" />
                           <span className="text-[10px] font-mono tracking-widest uppercase">No Active Protocols</span>
                        </div>
                     ) : (
                        tasks.map((task, i) => (
                          <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2 relative group overflow-hidden">
                             <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-bold text-white group-hover:text-blue-400 transition-colors uppercase">{task.title}</h4>
                                <div className={`w-1.5 h-1.5 rounded-full ${task.completed ? "bg-green-500" : "bg-orange-500 animate-pulse"}`} />
                             </div>
                             <p className="text-[10px] text-[#567a9b]">{task.description}</p>
                             <div className="flex items-center gap-3 mt-1">
                                <span className="text-[9px] font-mono text-blue-400/60 uppercase">Ref: {task.id?.substring(0, 8)}</span>
                             </div>
                             <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transform -translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                          </div>
                        ))
                     )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Typing Terminal */}
          <div className="pt-6 border-t border-white/5">
            <form onSubmit={handleTraditionalChat} className="flex flex-col gap-3">
              <div className="flex gap-3 bg-black/40 p-2.5 rounded-2xl border border-white/10 focus-within:border-blue-500/50 transition-all shadow-inner relative group">
                <Terminal className="w-4 h-4 text-white/20 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500/40 transition-colors" />
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type instruction..."
                  className="flex-1 bg-transparent border-none pl-8 pr-4 py-1 text-xs focus:outline-none font-mono text-neutral-100 placeholder:text-neutral-700 tracking-tight"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isTraditionalChatLoading}
                  className="bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)] p-2 rounded-xl hover:bg-blue-500 transition-all disabled:opacity-20 flex items-center justify-center transform active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex items-center justify-between px-2">
                <div className="flex gap-2">
                  <div className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[7px] font-mono text-blue-400 uppercase tracking-widest">Main Assistant</div>
                  <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[7px] font-mono text-white/30 uppercase tracking-widest">Child Agent: OFF</div>
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-50">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[7px] font-mono text-[#567a9b] uppercase tracking-widest">Live Session Ready</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reverse-spin {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes scan-x {
          0% { left: 0; transform: translateX(-100%); }
          100% { left: 100%; transform: translateX(0); }
        }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-reverse-spin { animation: reverse-spin 25s linear infinite; }
        .animate-spin-radar { animation: radar-sweep 4s linear infinite; }
        .animate-scan-x { animation: scan-x 3s ease-in-out infinite; }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e3a5f;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3b82f6;
        }
      `}</style>
    </div>
  );
}
