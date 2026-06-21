import { AlertTriangle } from "lucide-react";

export type UnsavedChangesChoice = "save" | "discard" | "cancel";

interface UnsavedChangesDialogProps {
  actionLabel: string;
  fileName: string;
  onChoose: (choice: UnsavedChangesChoice) => void;
}

export function UnsavedChangesDialog({ actionLabel, fileName, onChoose }: UnsavedChangesDialogProps) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="unsaved-dialog-title">
      <div className="modal-backdrop" />
      <section className="unsaved-dialog">
        <div className="unsaved-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h2 id="unsaved-dialog-title">保存对“{fileName}”的修改？</h2>
          <p>{actionLabel} 前，当前文档还有未保存内容。保存后继续，或放弃修改继续。</p>
        </div>
        <div className="dialog-actions">
          <button className="dialog-button" type="button" onClick={() => onChoose("cancel")}>
            取消
          </button>
          <button className="dialog-button" type="button" onClick={() => onChoose("discard")}>
            放弃修改
          </button>
          <button className="dialog-button is-primary" type="button" onClick={() => onChoose("save")}>
            保存并继续
          </button>
        </div>
      </section>
    </div>
  );
}
