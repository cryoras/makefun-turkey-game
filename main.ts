// Gobble Run is a self-contained static game. This entrypoint exports its playable
// directory and the four photographed game states, then describes those exact bytes.
// Set MAKEFUN_OUTPUT_DIR to inspect a local export without writing to /output.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const source = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(output, { recursive: true });
for (const directory of ['game', 'screenshots']) {
  cpSync(join(source, directory), join(output, directory), { recursive: true });
}
// Keep the export within the bounty's source, screenshot and static game limits.
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(output, 'dossier.json'), dossier);
console.log(`Gobble Run exported to ${output}`);
