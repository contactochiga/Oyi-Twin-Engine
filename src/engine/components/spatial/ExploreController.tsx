import oyiLogo from "../../assets/oyi-logo.png";
import type { ExploreInputAction, ExploreMovementIntent } from "../../spatial/exploreInput";
import type { PointerEvent } from "react";

interface ExploreControllerProps {
  active: boolean;
  movement: ExploreMovementIntent;
  targetLabel: string | null;
  onActivate: () => void;
  onActionStart: (action: ExploreInputAction) => void;
  onActionEnd: (action: ExploreInputAction) => void;
  onInteract: () => void;
  onOpenOyi: () => void;
  onExit: () => void;
}

const movementButton: Array<{ action: ExploreInputAction; label: string; className: string; pressed: (m: ExploreMovementIntent) => boolean }> = [
  { action: "MOVE_FORWARD", label: "↑", className: "explore-controller__button--up", pressed: (m) => m.forward },
  { action: "MOVE_LEFT", label: "←", className: "explore-controller__button--left", pressed: (m) => m.left },
  { action: "MOVE_RIGHT", label: "→", className: "explore-controller__button--right", pressed: (m) => m.right },
  { action: "MOVE_BACKWARD", label: "↓", className: "explore-controller__button--down", pressed: (m) => m.backward },
];

export function ExploreController({ active, movement, targetLabel, onActivate, onActionStart, onActionEnd, onInteract, onOpenOyi, onExit }: ExploreControllerProps) {
  if (!active) {
    return (
      <button className="explore-activate" data-explore-activate onClick={onActivate}>
        Explore
      </button>
    );
  }

  const holdStart = (action: ExploreInputAction) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onActionStart(action);
  };
  const holdEnd = (action: ExploreInputAction) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    onActionEnd(action);
  };

  return (
    <div className="explore-cluster" data-explore-controller>
      <div className="explore-target" data-explore-target aria-live="polite">
        {targetLabel ?? "Explore"}
      </div>
      <div className="explore-controller" aria-label="Explore movement controller">
        {movementButton.map((button) => (
          <button
            key={button.action}
            className={`explore-controller__button ${button.className}`}
            data-explore-action={button.action}
            aria-label={button.action.replace("MOVE_", "").toLowerCase()}
            aria-pressed={button.pressed(movement)}
            onPointerDown={holdStart(button.action)}
            onPointerUp={holdEnd(button.action)}
            onPointerCancel={holdEnd(button.action)}
            onPointerLeave={holdEnd(button.action)}
          >
            {button.label}
          </button>
        ))}
        <button className="explore-controller__button explore-controller__button--center" data-explore-action="INTERACT" onClick={onInteract}>
          <span>●</span>
          <small>Interact</small>
        </button>
      </div>
      <div className="explore-secondary" aria-label="Explore secondary controls">
        <button className="explore-secondary__button explore-secondary__button--oyi" data-explore-oyi onClick={onOpenOyi} aria-label="Open Oyi">
          <img src={typeof oyiLogo === "string" ? oyiLogo : oyiLogo.src} alt="" aria-hidden="true" />
          <span>OYI</span>
        </button>
        <button className="explore-secondary__button" data-explore-exit onClick={onExit}>
          Exit
        </button>
      </div>
    </div>
  );
}
