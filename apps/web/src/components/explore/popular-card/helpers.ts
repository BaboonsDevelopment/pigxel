/** Whether two pictures have the same pixels. */
export function samePixels(a: ImageData, b: ImageData) {
  for (let i = 0; i < a.data.length; i++)
    if (a.data[i] !== b.data[i]) return false;
  return true;
}
