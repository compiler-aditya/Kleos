function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  get FIRECRAWL_API_KEY() { return required('FIRECRAWL_API_KEY'); },
  get GEMINI_API_KEY() { return required('GEMINI_API_KEY'); },
  get ELEVENLABS_API_KEY() { return required('ELEVENLABS_API_KEY'); },
  get DATABASE_URL() { return required('DATABASE_URL'); },
  get BLOB_READ_WRITE_TOKEN() { return required('BLOB_READ_WRITE_TOKEN'); },
  get NEXT_PUBLIC_APP_URL() { return required('NEXT_PUBLIC_APP_URL'); },
  get INTERNAL_SECRET() { return required('INTERNAL_SECRET'); },
  get ELEVENLABS_WEBHOOK_SECRET() { return process.env.ELEVENLABS_WEBHOOK_SECRET ?? ''; },
};
