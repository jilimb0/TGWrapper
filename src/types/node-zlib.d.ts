declare module 'node:zlib' {
  export function deflateSync(
    buf: Uint8Array | string,
    options?: { level?: number },
  ): Uint8Array;
}
