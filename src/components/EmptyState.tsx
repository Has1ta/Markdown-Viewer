import { FileText } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">
        <FileText size={26} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
