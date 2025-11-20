import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Увеличим до 10 МБ на часть
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename, uploadId, partNumber, chunkData } = req.body;

    if (!filename || !uploadId || !partNumber || !chunkData) {
      return res.status(400).json({
        error: 'Все поля обязательны',
      });
    }

    const buffer = Buffer.from(chunkData, 'base64');

    const s3Client = new S3Client({
      region: 'ru-msk',
      endpoint: 'https://hb.ru-msk.vkcloud-storage.ru',
      credentials: {
        accessKeyId: process.env.VK_ACCESS_KEY!,
        secretAccessKey: process.env.VK_SECRET_KEY!,
      },
      forcePathStyle: true,
    });

    const command = new UploadPartCommand({
      Bucket: 'cse-contests',
      Key: filename,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: buffer,
    });

    const response = await s3Client.send(command);

    return res.status(200).json({
      ETag: response.ETag,
      PartNumber: partNumber,
    });
  } catch (err) {
    console.error('Upload chunk error:', err);
    return res.status(500).json({
      error: 'Ошибка загрузки части',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
