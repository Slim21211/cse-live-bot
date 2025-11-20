import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { filename, uploadId, parts } = req.body;

    if (!filename || !uploadId || !parts) {
      return res.status(400).json({ error: 'Missing params' });
    }

    const s3Client = new S3Client({
      region: 'ru-msk',
      endpoint: 'https://hb.ru-msk.vkcloud-storage.ru',
      credentials: {
        accessKeyId: process.env.VK_ACCESS_KEY!,
        secretAccessKey: process.env.VK_SECRET_KEY!,
      },
      forcePathStyle: true,
    });

    // Сортируем и чистим ETag
    const sortedParts = parts
      .sort((a: any, b: any) => a.PartNumber - b.PartNumber)
      .map((p: any) => ({
        PartNumber: p.PartNumber,
        ETag: p.ETag.replace(/"/g, ''),
      }));

    // Fire-and-forget: отправляем Complete асинхронно, не ждём
    s3Client
      .send(
        new CompleteMultipartUploadCommand({
          Bucket: 'cse-contests',
          Key: filename,
          UploadId: uploadId,
          MultipartUpload: { Parts: sortedParts },
        })
      )
      .catch((err) => {
        console.error('Background Complete failed:', err); // Лог в Vercel, но не ломает ответ
      });

    // Сразу возвращаем успех (VK Cloud завершит сам через 5–30 сек)
    const publicUrl = `https://cse-contests.hb.ru-msk.vkcloud-storage.ru/${filename}`;
    return res.status(200).json({
      publicUrl,
      note: 'Файл загружен, Complete в фоне (проверь бакет через 10 сек)',
    });
  } catch (err: any) {
    console.error('Complete setup error:', err);
    return res.status(500).json({ error: 'Setup failed, but parts saved' });
  }
}
