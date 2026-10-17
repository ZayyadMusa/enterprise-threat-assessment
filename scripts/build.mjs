import { cp, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";

await rm("dist", { recursive: true, force: true });
execFileSync(process.execPath, ["node_modules/typescript/bin/tsc"], { stdio: "inherit" });
await mkdir("dist/assets", { recursive: true });
await cp("public/index.html", "dist/index.html");
await cp("public/styles.css", "dist/assets/styles.css");
console.log("Built dist/ with strict TypeScript checking. No runtime dependencies.");
