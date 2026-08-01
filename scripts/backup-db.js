if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const fs = require('node:fs');
const child_process = require('node:child_process');
const path = require('node:path');

const { DB_URL, DB_NAME, MONGODUMP_PATH = 'mongodump' } = process.env;

if (!DB_URL) {
  console.error('❌ A variável DB_URL não foi encontrada.');
  process.exit(1);
}

if (!DB_NAME) {
  console.error('❌ A variável DB_NAME não foi encontrada.');
  process.exit(1);
}

const backupsDirectory = path.resolve('backups');

fs.mkdirSync(backupsDirectory, { recursive: true });

const now = new Date();

const timestamp = now.toISOString().replace(/[:.]/g, '-');

const backupFolder = path.resolve(backupsDirectory, `${DB_NAME}-${timestamp}`);

fs.mkdirSync(backupFolder, {
  recursive: true,
});

console.log(`📦 Criando backup de "${DB_NAME}"...`);

const result = child_process.spawnSync(
  MONGODUMP_PATH,
  [`--uri=${DB_URL}`, `--db=${DB_NAME}`, `--out=${backupFolder}`],
  {
    stdio: 'inherit',
    shell: false,
  },
);

if (result.error) {
  console.error('❌ Não foi possível executar o mongodump.');
  console.error(result.error.message);

  if (result.error.code === 'ENOENT') {
    console.error('Verifique se o MongoDB Database Tools está no PATH do Windows.');
  }

  process.exit(1);
}

if (result.status !== 0) {
  console.error(`❌ O backup falhou com código ${result.status}.`);
  process.exit(result.status ?? 1);
}

console.log(`✅ Backup criado em: ${backupFolder}`);
