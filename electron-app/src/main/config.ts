// import dotenv from 'dotenv';
// import path from 'path';
// import { app } from 'electron';
// import { generateKey } from 'crypto';

// // 1. Load .env file
// // In production, resources are often packed differently, so we check standard paths
// const isDev = !app.isPackaged;
// if (isDev) {
//   dotenv.config({ path: path.join(process.cwd(), '.env') });
// } else {
//   // In prod, you might load from resources path or rely on system env vars
//   dotenv.config({ path: path.join(process.resourcesPath, '.env') });
// }

// // 2. Validation Helper
// function getEnvVar(key: string, defaultValue?: string): string {
//   const value = process.env[key] || defaultValue;
//   if (value === undefined) {
//     throw new Error(`❌ Missing required environment variable: ${key}`);
//   }
//   return value;
// }

// // 3. Export Config Object
// export const config = {
//   isDev,
//   printerId: getEnvVar('PRINTER_ID', 'printer_default_01'),
//   backendUrl: isDev ? getEnvVar('BACKEND_URL', 'ws://localhost:3001') : getEnvVar('BACKEND_URL', 'ws://printly.backend.vercel.app') ,
//   supabase: {
//     url: getEnvVar('SUPABASE_URL'),
//     anonKey: getEnvVar('SUPABASE_ANON_KEY'),
//   },
//   paths: {
//     tempDir: path.join(app.getPath('temp'), 'printly'),
//     userData: app.getPath('userData')
//   }
// };


import { app } from 'electron';
import path from 'path';

// ✅ 1. Define Configs Manually (No .env dependency for Main Process)
const PROD_CONFIG = {
  // ⚠️ REPLACE THESE STRINGS WITH YOUR REAL VALUES BEFORE BUILDING
  BACKEND_URL: 'ws://printly-backend.vercel.app', 
  SUPABASE_URL: 'https://bsgsowngxjgcxgfcmgnf.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZ3Nvd25neGpnY3hnZmNtZ25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzQ5MDEsImV4cCI6MjA3OTIxMDkwMX0.zdIULgKbfDHtj9fwkdQeMBBGXoGbhafClZa8gPzwvgI',
  PRINTER_ID_DEFAULT: 'printer_default_01'
};

const DEV_CONFIG = {
  BACKEND_URL: 'ws://localhost:3001',
  SUPABASE_URL: PROD_CONFIG.SUPABASE_URL,
  SUPABASE_ANON_KEY: PROD_CONFIG.SUPABASE_ANON_KEY,
  PRINTER_ID_DEFAULT: 'printer_dev_01'
};

const isDev = !app.isPackaged;
const activeConfig = isDev ? DEV_CONFIG : PROD_CONFIG;

// ✅ 2. Export Config
export const config = {
  isDev,
  printerId: activeConfig.PRINTER_ID_DEFAULT,
  backendUrl: activeConfig.BACKEND_URL,
  supabase: {
    url: activeConfig.SUPABASE_URL,
    anonKey: activeConfig.SUPABASE_ANON_KEY,
  },
  paths: {
    tempDir: path.join(app.getPath('temp'), 'printly'),
    userData: app.getPath('userData')
  }
};
