const fs = require('fs');
const version = new Date().toISOString().slice(0, 16).replace('T', '-').replace(/:/g, '');
fs.writeFileSync('src/version.ts', `export const APP_VERSION = '${version}';\n`);
console.log(`Version: ${version}`);
