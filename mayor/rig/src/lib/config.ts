import fs from "fs";
import path from "path";

export interface AppConfig {
  openrouter: {
    apiKey: string;
    defaultModel: string;
  };
  uploads: {
    maxFileSizeMB: number;
  };
}

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;

  const configPath = path.join(process.cwd(), "config.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  cached = JSON.parse(raw) as AppConfig;
  return cached;
}
