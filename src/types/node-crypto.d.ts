declare module 'node:crypto' {
  export function timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean;
  const cryptoDefault: {
    timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean;
  };
  export default cryptoDefault;
}
