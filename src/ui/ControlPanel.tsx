import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { LUNA_LEVELS } from "../luna/lunaProgramme";
import { LUNA_CAMERA_PRESETS } from "../luna/lunaCameraPresets";
import { LUNA_GROUND_LOBBY, LUNA_L01_CLUB, LUNA_L06_APT_A, LUNA_L10_APT_A, LUNA_PENTHOUSE_INTERIOR, LUNA_ROOFTOP_SKY, type InteriorSpec, type RoomLayoutSpec } from "../luna/interiors/lunaInteriors";
import type { CameraFlightTarget } from "../engine/components/CameraRig";
import type { CanonicalRef } from "../engine/types";
import type { OperationalSystem } from "../engine/twinData";
import { useSceneMode } from "../engine/hooks/useSceneMode";
import { useInteriorFocus } from "../engine/hooks/useInteriorFocus";
import { SYSTEM_ORDER, SYSTEM_LABEL, SYSTEM_COLOR } from "../luna/operational/systemPresentation";
import type { LightingMode } from "../engine/hooks/useLightingMode";

const INTERIORS: Array<{ spec: InteriorSpec; enterLabel: string }> = [
  { spec: LUNA_GROUND_LOBBY, enterLabel: "Enter Ground Lobby" },
  { spec: LUNA_L01_CLUB, enterLabel: "Enter Residents' Club" },
  { spec: LUNA_L06_APT_A, enterLabel: "Enter Apartment A (L06)" },
  { spec: LUNA_L10_APT_A, enterLabel: "Enter Premium Residence (L10)" },
  { spec: LUNA_PENTHOUSE_INTERIOR, enterLabel: "Enter Penthouse" },
  { spec: LUNA_ROOFTOP_SKY, enterLabel: "Enter Luna Sky" },
];

interface ControlPanelProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onFlyTo: (preset: CameraFlightTarget) => void;
  onResetOverview: () => void;
  onIsolateLevel: (levelRef: CanonicalRef | null, label: string) => void;
  activeInteriorRef: CanonicalRef | null;
  onEnterInterior: (spec: InteriorSpec) => void;
  onFocusRoom: (spec: InteriorSpec, room: RoomLayoutSpec) => void;
  onExitInterior: () => void;
  onSelectSystem: (system: OperationalSystem | "all" | null) => void;
  lightingMode: LightingMode;
  onSetLightingMode: (mode: LightingMode) => void;
}

export function ControlPanel({ onFlyTo, onResetOverview, onIsolateLevel, activeInteriorRef, onEnterInterior, onFocusRoom, onExitInterior, onSelectSystem, lightingMode, onSetLightingMode }: ControlPanelProps) {
  const { isolatedLevelRef, exploded, toggleExploded, activeSystem, sectionMode, toggleSectionMode, sectionSide, setSectionSide } = useSceneMode();
  const { focusedRoomRef } = useInteriorFocus();

  const activeInterior = INTERIORS.find((i) => i.spec.interiorRef === activeInteriorRef)?.spec ?? null;

  return (
    <div className="control-panel">
      <div className="control-panel__header">
        <span className="control-panel__title">Luna Residences</span>
        <span className="control-panel__subtitle">Oyi Twin Engine — Visual Phase 6</span>
      </div>

      <div className="control-panel__section">
        <div className="control-panel__label">Camera</div>
        <div className="control-panel__row">
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.exteriorHero)}>Exterior Hero</button>
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.groundArrival)}>Ground Arrival</button>
        </div>
        <div className="control-panel__row">
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.lunaSky)}>Luna Sky</button>
          <button onClick={onResetOverview}>Reset / Overview</button>
        </div>
        <div className="control-panel__row">
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.waterfront)}>Waterfront</button>
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.explodedOverview)}>Exploded Overview</button>
        </div>
      </div>

      <div className="control-panel__section">
        <div className="control-panel__label">Context (Phase 15)</div>
        <div className="control-panel__row">
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.siteOverview)}>Site Overview</button>
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.neighborhoodApproach)}>Neighborhood</button>
        </div>
        <div className="control-panel__row">
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.victoriaIslandContext)}>Victoria Island</button>
          <button onClick={() => onFlyTo(LUNA_CAMERA_PRESETS.lunaApproach)}>Luna Approach</button>
        </div>
      </div>

      <div className="control-panel__section">
        <div className="control-panel__label">Lighting</div>
        <div className="control-panel__row">
          <button className={lightingMode === "day" ? "active" : ""} onClick={() => onSetLightingMode("day")}>
            Day
          </button>
          <button className={lightingMode === "goldenHour" ? "active" : ""} onClick={() => onSetLightingMode("goldenHour")}>
            Golden Hour
          </button>
          <button className={lightingMode === "evening" ? "active" : ""} onClick={() => onSetLightingMode("evening")}>
            Evening
          </button>
        </div>
      </div>

      <div className="control-panel__section">
        <div className="control-panel__label">Scene</div>
        <div className="control-panel__row">
          <button onClick={toggleExploded} className={exploded ? "active" : ""}>
            {exploded ? "Collapse floors" : "Explode floors"}
          </button>
        </div>
        <div className="control-panel__row">
          <button onClick={toggleSectionMode} className={sectionMode ? "active" : ""}>
            {sectionMode ? "Restore facade" : "Section / cutaway"}
          </button>
        </div>
        {sectionMode && (
          <div className="control-panel__row">
            {(["north", "south", "east", "west"] as const).map((side) => (
              <button key={side} className={sectionSide === side ? "active" : ""} onClick={() => setSectionSide(side)}>
                Cut {side}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="control-panel__section control-panel__levels">
        <div className="control-panel__label">Engineering Layers</div>
        <div className="control-panel__level-list">
          <button className={activeSystem === null ? "active" : ""} onClick={() => onSelectSystem(null)}>
            Architecture
          </button>
          <button className={activeSystem === "all" ? "active" : ""} onClick={() => onSelectSystem("all")}>
            All Systems
          </button>
          {SYSTEM_ORDER.map((system) => (
            <button key={system} className={`system-toggle ${activeSystem === system ? "active" : ""}`} onClick={() => onSelectSystem(system)}>
              <span className="system-toggle__swatch" style={{ background: SYSTEM_COLOR[system] }} />
              {SYSTEM_LABEL[system]}
            </button>
          ))}
        </div>
      </div>

      {activeInterior ? (
        <div className="control-panel__section control-panel__levels">
          <div className="control-panel__label">Inside: {activeInterior.label}</div>
          <button className="control-panel__restore" onClick={onExitInterior}>
            Exit to Exterior
          </button>
          <div className="control-panel__level-list">
            {activeInterior.rooms.map((room) => (
              <button key={room.ref} className={focusedRoomRef === room.ref ? "active" : ""} onClick={() => onFocusRoom(activeInterior, room)}>
                {room.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="control-panel__section control-panel__levels">
          <div className="control-panel__label">Interiors</div>
          <div className="control-panel__level-list">
            {INTERIORS.map(({ spec, enterLabel }) => (
              <button key={spec.interiorRef} onClick={() => onEnterInterior(spec)}>
                {enterLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="control-panel__section control-panel__levels">
        <div className="control-panel__label">Levels</div>
        <div className="control-panel__level-list">
          {[...LUNA_LEVELS].reverse().map((level) => (
            <button
              key={level.ref}
              className={isolatedLevelRef === level.ref ? "active" : ""}
              onClick={() => onIsolateLevel(isolatedLevelRef === level.ref ? null : level.ref, level.label)}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
