const fs = require('fs');
const path = require('path');

const fallbackApiUrl = 'https://proyecto7mosemestre.onrender.com';
const apiUrl = (process.env.API_URL || fallbackApiUrl).trim().replace(/\/+$/, '');
const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

if (!apiUrl) {
  console.error('[configure-environment] API_URL is empty. The app will show a visible backend URL error.');
}

const contents = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

fs.writeFileSync(targetPath, contents);
console.log(`[configure-environment] environment.prod.ts API_URL=${apiUrl || '(empty)'}`);
