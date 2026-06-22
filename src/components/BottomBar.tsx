import { forwardRef, type ComponentType } from "react";

interface BottomBarAction {
  label: string;
  icon: ComponentType<{ size?: number }>;
  primary?: boolean;
  onClick?: () => void;
}

interface BottomBarProps {
  actions: BottomBarAction[];
}

export const BottomBar = forwardRef<HTMLElement, BottomBarProps>(function BottomBar({ actions }, ref) {
  return (
    <footer ref={ref} className="bottom-bar" aria-label="文档操作">
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <button
            key={action.label}
            className={action.primary ? "bar-button is-primary" : "bar-button"}
            type="button"
            onClick={action.onClick}
          >
            <Icon size={17} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </footer>
  );
});
