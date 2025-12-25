import dotenv from 'dotenv';
import path from 'path';
import { app } from 'electron';

// 1. Load .env file
// In production, resources are often packed differently, so we check standard paths
const isDev = !app.isPackaged;
if (isDev) {
  dotenv.config({ path: path.join(process.cwd(), '.env') });
} else {
  // In prod, you might load from resources path or rely on system env vars
  dotenv.config({ path: path.join(process.resourcesPath, '.env') });
}

// 2. Validation Helper
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value;
}

// 3. Export Config Object
export const config = {
  isDev,
  printerId: getEnvVar('PRINTER_ID', 'printer_default_01'),
  backendUrl: getEnvVar('BACKEND_URL', 'ws://localhost:3001'),
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
  },
  paths: {
    tempDir: path.join(app.getPath('temp'), 'printly'),
    userData: app.getPath('userData')
  }
};
