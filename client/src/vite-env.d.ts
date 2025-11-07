/// <reference types="vite/client" />

// Declare CSS modules
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Extend ImportMeta for Vite environment variables
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
