import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export async function mixAudio({
  dialogueBuffer,
  musicBuffer,
}: {
  dialogueBuffer: Buffer;
  musicBuffer: Buffer | null;
  sfxBuffers: Record<string, Buffer>;
}): Promise<Buffer> {
  if (!musicBuffer) {
    return dialogueBuffer;
  }

  const id = randomUUID();
  const tmpDir = '/tmp';
  const dialoguePath = path.join(tmpDir, `${id}-dialogue.mp3`);
  const musicPath = path.join(tmpDir, `${id}-music.mp3`);
  const outputPath = path.join(tmpDir, `${id}-output.mp3`);
  const filesToClean = [dialoguePath, musicPath, outputPath];

  try {
    await fs.writeFile(dialoguePath, dialogueBuffer);
    await fs.writeFile(musicPath, musicBuffer);

    // Dynamically import fluent-ffmpeg to avoid hard dependency
    const ffmpeg = (await import('fluent-ffmpeg')).default;

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(dialoguePath)
        .input(musicPath)
        .complexFilter([
          '[1:a]volume=0.1[music]',
          '[0:a][music]amix=inputs=2:duration=first[out]',
        ])
        .outputOptions(['-map [out]', '-c:a libmp3lame', '-q:a 4'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    return await fs.readFile(outputPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ENOENT') || msg.includes('spawn') || msg.includes('Cannot find')) {
      console.log('[ffmpeg] binary not available, using dialogue audio directly');
      return dialogueBuffer;
    }
    console.error('[ffmpeg] mix failed, falling back to dialogue audio:', msg);
    return dialogueBuffer;
  } finally {
    await Promise.allSettled(filesToClean.map((f) => fs.unlink(f).catch(() => {})));
  }
}
