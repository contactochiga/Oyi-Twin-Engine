export type ExploreInputAction =
  | "MOVE_FORWARD"
  | "MOVE_BACKWARD"
  | "MOVE_LEFT"
  | "MOVE_RIGHT"
  | "LOOK"
  | "INTERACT"
  | "EXIT";

export interface ExploreMovementIntent {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export const EMPTY_EXPLORE_MOVEMENT: ExploreMovementIntent = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

export function movementWithAction(intent: ExploreMovementIntent, action: ExploreInputAction, active: boolean): ExploreMovementIntent {
  if (action === "MOVE_FORWARD") return { ...intent, forward: active };
  if (action === "MOVE_BACKWARD") return { ...intent, backward: active };
  if (action === "MOVE_LEFT") return { ...intent, left: active };
  if (action === "MOVE_RIGHT") return { ...intent, right: active };
  return intent;
}

export function hasExploreMovement(intent: ExploreMovementIntent): boolean {
  return intent.forward || intent.backward || intent.left || intent.right;
}
