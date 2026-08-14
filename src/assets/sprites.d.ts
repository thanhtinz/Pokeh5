/** Vite trả về URL cho mỗi ảnh import vào. */
declare module '*.png' {
  const url: string;
  export default url;
}
