import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, X, GripHorizontal, Maximize2, Minimize2 } from "lucide-react";

interface CameraBoxProps {
  onCapture?: (blob: Blob) => void;
  onClose?: () => void;
}

export const CameraBox: React.FC<CameraBoxProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const startCamera = async () => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { aspectRatio: 1 },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsActive(true);
    } catch (err) {
      console.error("SIR: Neural interface failed to access optical sensors.", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 100 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="fixed bottom-24 right-8 z-[100] w-64 md:w-80 group"
    >
      <div className="bg-black/90 border border-blue-500/30 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.2)] backdrop-blur-xl">
        {/* Header/Grab Handle */}
        <div className="bg-blue-500/10 border-b border-blue-500/20 p-2 flex items-center justify-between cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-blue-400/50" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400">IRIS Optical Feed</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-red-500/20 text-red-500/50 hover:text-red-500 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Video Area */}
        <div className={`relative transition-all duration-300 ease-in-out ${isMinimized ? 'h-0' : 'aspect-square'}`}>
          {!isMinimized && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />
              
              {!isActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/50">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Camera className="w-8 h-8 text-blue-400/20" />
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono uppercase tracking-tighter rounded-full transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    Engage Sensors
                  </button>
                </div>
              )}

              {isActive && (
                <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={stopCamera}
                    className="p-3 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-all backdrop-blur-md"
                    title="Stop Feedback"
                  >
                    <CameraOff className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              {/* Scanline Effect overlay */}
              {isActive && (
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-10 bg-[length:100%_4px,3px_100%]" />
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};
