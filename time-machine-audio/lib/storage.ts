import { put } from '@vercel/blob';

export async function uploadFromBase64(
  base64: string,
  path: string,
  contentType: string
): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');
  return uploadFromBuffer(buffer, path, contentType);
}

export async function uploadFromBuffer(
  buffer: Buffer,
  path: string,
  contentType: string
): Promise<string> {
  const blob = await put(path, buffer, {
    access: 'public',
    contentType,
  });
  return blob.url;
}
