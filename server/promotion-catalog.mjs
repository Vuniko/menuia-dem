import {readFile} from 'node:fs/promises';
// The same public, fictional data file is consumed by the demo UI and server.
export const demoPromotions=JSON.parse(await readFile(new URL('../assets/demo-promotions.json',import.meta.url),'utf8'));
