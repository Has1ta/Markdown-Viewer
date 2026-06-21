import type { ComponentType } from "react";

interface BottomBarAction {
  label: string;
  icon: ComponentType<{ size?: number }>;
  primary?: boolean;
}

interface BottomBarProps {
  actions: BottomBarAction[];
}

export function BottomBar({ actions }: BottomBarProps) {
  return (
    <footer className="bottom-bar" aria-label="文档操作">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <button key={action.label} className={action.primary ? "bar-button is-primary" : "bar-button"} type="button">
            <Icon size={17} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </footer>
  );
}
