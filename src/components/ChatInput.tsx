import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from "react";
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  StopCircle,
  X,
  FileText,
  CornerDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (
    message: string,
    image?: File,
    document?: File,
    quotedText?: string
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  quotedText?: string;
  onClearQuote?: () => void;
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Message Erudite...",
  quotedText,
  onClearQuote,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Focus textarea when quote is added
  useEffect(() => {
    if (quotedText && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [quotedText]);

  // Generate image preview when image file changes
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
    }
    e.target.value = ""; // Reset to allow re-selecting same file
  };

  const handleDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
    }
    e.target.value = ""; // Reset to allow re-selecting same file
  };

  const handleSubmit = () => {
    if (
      (value.trim() || imageFile || documentFile || quotedText) &&
      !disabled
    ) {
      onSend(
        value.trim(),
        imageFile || undefined,
        documentFile || undefined,
        quotedText || undefined
      );
      setValue("");
      setImageFile(null);
      setDocumentFile(null);
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend =
    (value.trim().length > 0 || imageFile || documentFile || quotedText) &&
    !disabled;
  const charCount = value.length;
  const isNearLimit = charCount > 3500;
  const maxChars = 4000;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Quoted text preview - like ChatGPT */}
      {quotedText && (
        <div className="mb-2 flex items-start gap-2 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl animate-in slide-in-from-bottom-2 duration-200">
          <CornerDownRight
            size={16}
            className="text-emerald-400 mt-0.5 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 italic">
              "{quotedText}"
            </p>
          </div>
          <button
            onClick={onClearQuote}
            className="p-1 hover:bg-[var(--color-surface-active)] rounded-lg transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
        {/* File preview section */}
        {(imagePreview || documentFile) && (
          <div className="flex items-center gap-3 px-4 pt-3 pb-1">
            {imagePreview && (
              <div className="relative group">
                <img
                  src={imagePreview}
                  alt="Attached"
                  className="h-16 w-16 rounded-xl object-cover border border-[var(--color-border)]"
                />
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {documentFile && (
              <div className="relative group flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface-active)] border border-[var(--color-border)]">
                <FileText size={18} className="text-emerald-400" />
                <span className="text-sm text-[var(--color-text-secondary)] max-w-[150px] truncate">
                  {documentFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setDocumentFile(null)}
                  className="p-0.5 hover:bg-red-500/20 rounded transition-colors text-[var(--color-text-muted)] hover:text-red-400"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx"
          onChange={handleDocumentChange}
          className="hidden"
        />

        {/* Textarea row */}
        <div className="flex items-end gap-4">
          {/* Left actions */}
          <div className="flex items-center mb-2">
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              className={cn(
                "p-3 rounded-xl transition-all group",
                documentFile
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                "hover:bg-[var(--color-surface-active)]",
                "active:scale-95"
              )}
              title="Attach document"
            >
              <Paperclip
                size={24}
                className="group-hover:rotate-12 transition-transform"
              />
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className={cn(
                "p-3 rounded-xl transition-all group",
                imageFile
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                "hover:bg-[var(--color-surface-active)]",
                "active:scale-95"
              )}
              title="Upload image"
            >
              <ImageIcon
                size={24}
                className="group-hover:scale-110 transition-transform"
              />
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
            placeholder={quotedText ? "Ask about this..." : placeholder}
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
                <Mic
                  size={24}
                  className="group-hover:scale-110 transition-transform"
                />
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
                  canSend &&
                    "group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                )}
              />
            </button>
          </div>
        </div>

        {/* Character count indicator */}
        {isNearLimit && (
          <div className="px-4 pb-2 flex justify-end">
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                charCount >= maxChars
                  ? "text-red-400"
                  : charCount > 3800
                  ? "text-amber-400"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              {charCount} / {maxChars}
            </span>
          </div>
        )}
      </div>

      {/* Footer text */}
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-dim)] font-medium">
        {" "}
        {/* Increased margin top */}
        <span>Erudite can make mistakes. Check important info.</span>
      </div>
    </div>
  );
}
