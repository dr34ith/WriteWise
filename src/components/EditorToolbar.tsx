"use client";

import { useState } from "react";
import { CopyIcon, DownloadIcon, RedoIcon, TrashIcon, UndoIcon } from "@/components/icons";

export interface EditorToolbarProps {
  text: string;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-foreground-muted transition-colors transition-transform duration-150 hover:bg-surface-muted hover:text-foreground hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100";

export function EditorToolbar({ text, onClear, onUndo, onRedo }: EditorToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleClearClick = () => {
    if (confirmingClear) {
      onClear();
      setConfirmingClear(false);
      return;
    }
    setConfirmingClear(true);
    setTimeout(() => setConfirmingClear(false), 3000);
  };

  const handleDownload = (extension: "md" | "txt") => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `writewise-draft.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadMenuOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onUndo} aria-label="Undo" className={buttonClass}>
        <UndoIcon />
      </button>
      <button type="button" onClick={onRedo} aria-label="Redo" className={buttonClass}>
        <RedoIcon />
      </button>
      <button type="button" onClick={handleCopy} aria-label="Copy text" className={buttonClass}>
        <CopyIcon />
        {copied ? "Copied!" : "Copy"}
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setDownloadMenuOpen((prev) => !prev)}
          aria-label="Download text"
          aria-expanded={downloadMenuOpen}
          className={buttonClass}
        >
          <DownloadIcon />
          Download
        </button>
        {downloadMenuOpen && (
          <div className="animate-pop-in absolute left-0 top-full z-20 mt-1 flex flex-col overflow-hidden rounded-md border border-border bg-surface shadow-md">
            <button
              type="button"
              onClick={() => handleDownload("md")}
              className="px-3 py-1.5 text-left text-xs text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            >
              .md (Markdown)
            </button>
            <button
              type="button"
              onClick={() => handleDownload("txt")}
              className="px-3 py-1.5 text-left text-xs text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            >
              .txt (Plain text)
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleClearClick}
        aria-label={confirmingClear ? "Confirm clear editor" : "Clear editor"}
        className={`${buttonClass} ${confirmingClear ? "border-severity-error text-severity-error" : ""}`}
      >
        <TrashIcon />
        {confirmingClear ? "Confirm clear?" : "Clear"}
      </button>
    </div>
  );
}
