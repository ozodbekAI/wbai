export function dataUrlToFile(dataUrl, filename) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/:(.*?);/)[1];
  const bin = atob(base64);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
