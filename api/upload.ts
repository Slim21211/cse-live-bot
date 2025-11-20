import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename, contentType, fileData } = req.body;

    console.log('Получен файл:', filename, contentType);

    if (!filename || !contentType || !fileData) {
      return res.status(400).json({
        error: 'filename, contentType и fileData обязательны',
      });
    }

    // Декодируем base64
    const buffer = Buffer.from(fileData, 'base64');
    const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    console.log('Размер файла:', fileSizeMB, 'МБ');

    const s3Client = new S3Client({
      region: 'ru-msk',
      endpoint: 'https://hb.ru-msk.vkcloud-storage.ru',
      credentials: {
        accessKeyId: process.env.VK_ACCESS_KEY!,
        secretAccessKey: process.env.VK_SECRET_KEY!,
      },
      forcePathStyle: true,
    });

    const command = new PutObjectCommand({
      Bucket: 'cse-contests',
      Key: filename,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    console.log('Загрузка в VK Cloud...');
    await s3Client.send(command);
    console.log('Успешно загружено!');

    const publicUrl = `https://cse-contests.hb.ru-msk.vkcloud-storage.ru/${filename}`;

    return res.status(200).json({ publicUrl });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({
      error: 'Ошибка загрузки файла',
      details: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
