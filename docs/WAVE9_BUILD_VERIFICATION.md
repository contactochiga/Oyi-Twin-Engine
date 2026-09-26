# Wave 9 host build verification

Baseline: `fda2a27a31208541cb030c40ad26b01f1bc0fee0`. This is new work from durable source, not recovered cloud history.

The standalone TypeScript build failed because Vite declares PNG imports as strings, making the inline alternate `.src` branch `never`. The shared image URL helper accepts both Vite strings and Next static image objects. Two render components now call it. No simulation, navigation, permission, or intelligence behavior changes. React review found no new hooks, render side effects, or accessibility changes.

Validation: clean `npm ci`, `npm run build`, `npm run lint` (existing warnings), image helper test, representation, Apartment A Oyi semantics, Apartment A map policy, and ingestion pass. Build retains its existing large-chunk warning. `npm run test:architecture` cannot start: `puppeteer-core` is not declared/installed in this clean checkout. This browser suite is NOT passed. The mistaken `test:map-policy` invocation was corrected to the actual `test:apt-a-map-policy` script.

No machine-local dependency was introduced. Facility's exact remote Twin pin remains unchanged. This record does not certify overall Wave 9 closure or hardware/browser acceptance.
