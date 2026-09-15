Luna Twin presentation refinement — 8 September 2026

Completed locally at http://127.0.0.1:5173. This continuation changes the existing presentation controls only.

Preserved work:

- Full-screen Luna, glass top bar, hamburger, Oyi field, weather/time/date, empty sidebar shell, and Facility Manager / Ochiga Properties footer.
- Existing sidebar/rail shifting: 240px on desktop, responsive width on small screens. Context cards remain clear of the sidebar on mobile.
- All 16 level plans, B1 equipment markers and system legend, canonical room/core geometry, occupancy/status rendering, and the single contextual-card hierarchy.
- Existing scene/interior camera presets and navigation remain available through level cards and Oyi. The rail’s former Scenes launcher now opens View as requested.
- Existing lightweight engineering SVG previews, operational data, runtime state, and original Three.js scene.
- RepresentationPolicy, plan files, top-bar controller pathway, private-home summary navigation guard, and representation regression script are unchanged from the continuation baseline.

Files changed in this continuation:

- src/App.tsx — click-away coordination, current-layer launcher data, repurposed View options, derived view selection using existing engine flags.
- src/App.css — compact active engineering icon/label layout.
- src/engine/components/spatial/EngineeringDrawer.tsx — persistent selection; removed Cutaway/Explode UI; retained all existing layer cards/previews.
- src/engine/components/spatial/LevelRail.tsx — active representation label and matching existing SystemIcon; View launcher.
- src/engine/components/spatial/ScenesDrawer.tsx — reused the existing tray with configurable title, selection dismissal, and View options; no duplicate tray component.
- scripts/verifyPresentation.mjs — preserved plan/privacy/Oyi coverage, repaired SVG keyboard test helper, added persistent-tray, click-away, icon, composition, and real camera/pointer assertions.

Generated artifacts include continuation-changed-files.txt, refreshed build/typecheck/lint/policy/browser logs, launcher screenshots, and full-view screenshots. The original changed-files.txt is preserved.

Interaction behavior:

- Engineering selection updates activeSystem and leaves the tray open. The launcher displays only the active layer name and its matching icon, such as Architecture, All Systems, Structure, Water, or Drainage.
- Engineering remains one horizontally scrollable, non-wrapping row; verified height was 186px at 1440×1000. No live preview canvases were added.
- View reuses the former Scenes tray and contains Normal, Cutaway, and Explode. Selection remains open. Normal clears the existing sectionMode/exploded flags; Cutaway sets sectionMode only; Explode sets exploded only.
- View state is derived from the existing flags, with no second runtime or view-state store. Changing View does not change activeSystem, and changing engineering layers retains the selected spatial view.
- Both trays close via their X or an outside pointer interaction, including changing to the other tray. Clicking the rail launcher again also dismisses its open tray. Selecting cards does not dismiss it.
- A document capture-phase pointerdown listener checks the original target. Sidebar/tray descendants and their own launcher are excluded from click-away handling. It does not prevent default or stop outside events, so the original canvas gesture continues normally.
- Tray pointerdown events stop bubbling within the overlay; the overlays are DOM siblings of the canvas, so their gestures do not reach OrbitControls. Sidebar footer/menu interactions remain inside the sidebar and execute before any dismissal.

Verification results:

- npm run build: PASS, including TypeScript build.
- ./node_modules/.bin/tsc -b --pretty false: PASS.
- npm run lint: PASS with 25 existing warnings; no additional warning count from this continuation.
- npm run test:representation: PASS. All 16 plans, canonical geometry, Facility private-unit/room OPERATIONAL_2D, resident own-home access, unrelated-home HIDDEN, and existing Facility service-asset exceptions verified.
- lunaRepresentationPolicy.ts: byte-for-byte unchanged against the saved continuation baseline.
- Presentation regression: PASS in local Chrome using actual Puppeteer pointer/keyboard events. All 16 plans, selected apartment summaries, authorized Reception entry, Oyi private-home summary behavior, Luna Sky navigation, sidebar shift/close, mobile layout, persistent engineering selection, persistent View selection, explicit close, and click-away verified.
- Twelve active engineering labels and distinct SVG icons verified, including the five specifically requested. Screenshots saved for Architecture, All Systems, Structure, Water, and Drainage.
- Real R3F camera position/quaternion inspected using the already-loaded R3F root: dragging inside Engineering and View leaves the camera unchanged and sends no pointerdown to the canvas. Outside drag changes camera position and resumes OrbitControls. No test camera or test scene was added.
- Browser page errors: none.

Remaining limitations:

- This supplied directory has no .git metadata. Git status/history were unavailable; no commits were fabricated. Changes were compared against /tmp/luna-continuation-baseline, with the earlier baseline retained separately.
- The existing Vite bundle-size warning remains, as do the 25 existing engine lint warnings.
- Existing modeled-data limits remain: B1 equipment placement is represented, while unmodeled parking/service room boundaries are not invented. Facility’s PH plan remains the policy-safe unit outline.
- Browser pointer regression used local desktop Chrome, plus a 390px viewport for responsive checks; physical touchscreen hardware was not tested.

No production deployment, Supabase writes, cloud resources, service-role keys, physical-device commands, or remote migrations were used. The local Vite server is left running for review. No further feature phase was started.
