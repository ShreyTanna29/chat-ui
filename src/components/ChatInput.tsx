import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Send, Paperclip, Mic, Image as ImageIcon, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = "Message Erudite..." }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setValue('')
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSend = value.trim().length > 0 && !disabled
  const charCount = value.length
  const isNearLimit = charCount > 3500
  const maxChars = 4000

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Main input container */}
      <div 
        className={cn(
          "relative rounded-3xl transition-all duration-300",
          "bg-[var(--color-surface)]",
          "border shadow-xl",
          isFocused 
            ? "border-emerald-500/50 shadow-emerald-500/10" 
            : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] shadow-black/20"
        )}
      >
        {/* Textarea row */}
        <div className="flex items-end gap-4">
          {/* Left actions */}
          <div className="flex items-center mb-2">
            <button
              type="button"
              className={cn(
                "p-3 rounded-xl transition-all group",
                "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                "hover:bg-[var(--color-surface-active)]",
                "active:scale-95"
              )}
              title="Attach file"
            >
              <Paperclip size={24} className="group-hover:rotate-12 transition-transform" />
            </button>
            <button
              type="button"
              className={cn(
                "p-3 rounded-xl transition-all group",
                "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                "hover:bg-[var(--color-surface-active)]",
                "active:scale-95"
              )}
              title="Upload image"
            >
              <ImageIcon size={24} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxChars}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-[var(--color-text-primary)]",
              "placeholder:text-[var(--color-text-muted)]",
              "focus:outline-none focus-visible:outline-none text-lg leading-relaxed max-h-[200px] py-4",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />

          {/* Right actions */}
          <div className="flex items-center mb-2">
            {/* Voice input */}
            <button
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              className={cn(
                "p-3 rounded-xl transition-all group relative overflow-hidden",
                isRecording 
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-active)]",
                "active:scale-95"
              )}
              title={isRecording ? "Stop recording" : "Voice input"}
            >
              {isRecording ? (
                <>
                  <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
                  <StopCircle size={24} className="relative z-10" />
                </>
              ) : (
                <Mic size={24} className="group-hover:scale-110 transition-transform" /> 
              )}
            </button>
            
            {/* Send button */}
            <button
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                "p-2 mr-2 rounded-xl transition-all duration-300 relative overflow-hidden group",
                canSend
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95"
                  : "bg-[var(--color-surface-active)] text-[var(--color-text-dim)] cursor-not-allowed"
              )}
            >
              <Send 
                size={22} 
                className={cn(
                  "relative z-10 transition-all",
                  canSend && "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                )} 
              />
            </button>
          </div>
        </div>

        {/* Character count indicator */}
        {isNearLimit && (
          <div className="px-4 pb-2 flex justify-end">
            <span className={cn(
              "text-xs font-medium transition-colors",
              charCount >= maxChars 
                ? "text-red-400" 
                : charCount > 3800 
                  ? "text-amber-400" 
                  : "text-[var(--color-text-muted)]"
            )}>
              {charCount} / {maxChars}
            </span>
          </div>
        )}
      </div>

      {/* Footer text */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-dim)] font-medium"> {/* Increased margin top */}
        <span>Erudite can make mistakes. Check important info.</span>
      </div>
    </div>
  )
}
