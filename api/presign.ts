import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({
        error: 'filename и contentType обязательны',
      });
    }

    const s3Client = new S3Client({
      region: 'ru-msk',
      endpoint: 'https://hb.ru-msk.vkcloud-storage.ru', // ✅ Правильный endpoint
      credentials: {
        accessKeyId: process.env.VK_ACCESS_KEY!,
        secretAccessKey: process.env.VK_SECRET_KEY!,
      },
      forcePathStyle: true, // ✅ Важно для VK Cloud
    });

    const command = new PutObjectCommand({
      Bucket: 'cse-contests',
      Key: filename,
      ContentType: contentType,
      ACL: 'public-read',
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    const publicUrl = `https://cse-contests.hb.ru-msk.vkcloud-storage.ru/${filename}`;

    return res.status(200).json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error('Presign error:', err);
    return res.status(500).json({
      error: 'Ошибка генерации pre-signed URL',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
