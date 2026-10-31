import path from 'node:path';
import {ROOT,readJson} from './package-lib.mjs';
const [key,value]=process.argv.slice(2);
if(key==='name') {
  const name=readJson(path.join(ROOT,'package.json')).name;
  if(!/^[a-z0-9][a-z0-9-]*$/.test(name))throw new Error('Nome pacchetto non sicuro');
  console.log(name);
} else if(key==='resolve'&&value)console.log(path.resolve(process.cwd(),value));
else throw new Error('Uso: node scripts/package-info.mjs name | resolve PERCORSO');
