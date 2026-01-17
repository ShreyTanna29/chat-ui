import React, { useEffect, useState } from "react";
import { Mic, MicOff, PhoneOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceChatUIProps {
  onEndCall: () => void;
  voiceStatus?: string;
  isVoiceConnecting?: boolean;
}

export function VoiceChatUI({
  onEndCall,
  voiceStatus,
  isVoiceConnecting,
}: VoiceChatUIProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-background relative overflow-hidden animate-in fade-in duration-500">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-md px-6">
        {/* Status & Timer */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-surface)]/50 border border-[var(--color-border)] backdrop-blur-md">
            <div
              className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isVoiceConnecting ? "bg-amber-400" : "bg-emerald-400",
              )}
            />
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              {voiceStatus || (isVoiceConnecting ? "Connecting..." : "Live")}
            </span>
          </div>
          <span className="text-4xl font-light tracking-wider text-[var(--color-text-primary)] font-mono">
            {formatTime(duration)}
          </span>
        </div>

        {/* Visualizer / Avatar */}
        <div className="relative">
          {/* Outer ripples */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute inset-0 rounded-full border border-emerald-500/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />

          {/* Main circle */}
          <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-active)] border border-[var(--color-border)] shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5" />

            {/* Inner pulsing core */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-500/20 to-emerald-400/10 backdrop-blur-sm flex items-center justify-center animate-pulse-slow">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500/30 to-emerald-400/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <img
                  src="/logo.jpg"
                  alt="Erudite"
                  className="w-full h-full object-cover opacity-80 mix-blend-overlay"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 mt-8">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={cn(
              "p-4 rounded-full transition-all duration-300 border backdrop-blur-md",
              isMuted
                ? "bg-white text-black border-white"
                : "bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:bg-[var(--color-surface-active)]",
            )}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>

          <button
            onClick={onEndCall}
            className="p-6 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-300 scale-100 hover:scale-105 shadow-lg shadow-red-500/10"
          >
            <PhoneOff size={32} fill="currentColor" />
          </button>

          <button
            onClick={onEndCall} // Currently just ends call, could be minimize in future
            className="p-4 rounded-full bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-active)] transition-all duration-300 backdrop-blur-md"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-8 text-sm text-[var(--color-text-muted)]">
        Erudite is listening
      </div>
    </div>
  );
}
