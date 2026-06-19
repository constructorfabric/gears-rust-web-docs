/// <reference types="astro/client" />

// Virtual module provided by config/lunaria-starlight.mjs at build time. Declared
// here so `astro check` can resolve the import in components/lunaria/Dashboard.astro.
declare module 'virtual:lunaria-starlight' {
  export const pluginConfig: {
    configPath: string;
    route: string;
    sync: boolean;
  };
  export const isShallowRepo: boolean;
}
