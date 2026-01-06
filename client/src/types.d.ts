// Declarações de tipos para polyfills e APIs não nativas do navegador

declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}

export {};