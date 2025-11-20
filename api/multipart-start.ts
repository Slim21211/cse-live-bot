import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, CreateMultipartUploadCommand } from '@aws-sdk/client-s3';

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
      endpoint: 'https://hb.ru-msk.vkcloud-storage.ru',
      credentials: {
        accessKeyId: process.env.VK_ACCESS_KEY!,
        secretAccessKey: process.env.VK_SECRET_KEY!,
      },
      forcePathStyle: true,
    });

    const command = new CreateMultipartUploadCommand({
      Bucket: 'cse-contests',
      Key: filename,
      ContentType: contentType,
      ACL: 'public-read',
    });

    const response = await s3Client.send(command);

    return res.status(200).json({
      uploadId: response.UploadId,
      key: filename,
    });
  } catch (err) {
    console.error('Start multipart error:', err);
    return res.status(500).json({
      error: 'Ошибка начала загрузки',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
