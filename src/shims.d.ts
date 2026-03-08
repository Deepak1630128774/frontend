declare module "react";
declare module "react/jsx-runtime";

declare interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
