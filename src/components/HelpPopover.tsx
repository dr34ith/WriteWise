"use client";

import { useState } from "react";
import { HelpIcon } from "@/components/icons";

export function HelpPopover() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Help and keyboard shortcuts"
        aria-expanded={open}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground-muted transition-colors transition-transform duration-150 hover:bg-surface-muted hover:text-foreground hover:scale-105 active:scale-95"
      >
        <HelpIcon />
      </button>
      {open && (
        <div className="animate-pop-in absolute right-0 top-full z-20 mt-2 w-72 rounded-md border border-border bg-surface p-3 text-xs text-foreground-muted shadow-md">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Tips &amp; shortcuts</h2>
          <ul className="space-y-1.5">
            <li>
              <strong className="text-foreground">Deep check:</strong> runs automatically about
              400ms after you stop typing.
            </li>
            <li>
              <strong className="text-foreground">Rephrase:</strong> click into a sentence in the
              editor, pick a style, review the tracked changes, then Accept.
            </li>
            <li>
              <strong className="text-foreground">Tabs:</strong> use Left/Right/Home/End arrow
              keys to move between Issues and Rephrase.
            </li>
            <li>
              <strong className="text-foreground">Undo/Redo:</strong> Ctrl/Cmd+Z and
              Ctrl/Cmd+Shift+Z in the editor, or the toolbar buttons.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
