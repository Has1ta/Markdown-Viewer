import { FileDown } from "lucide-react";

interface DropOverlayProps {
  message: string;
}

export function DropOverlay({ message }: DropOverlayProps) {
  return (
    <div className="drop-overlay" aria-live="polite">
      <div className="drop-overlay-panel">
        <FileDown size={28} />
        <span>{message}</span>
      </div>
    </div>
  );
}
