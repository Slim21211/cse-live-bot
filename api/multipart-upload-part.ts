// src/api/multipart-upload-part.ts   ← именно такое имя и путь!

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'ru-msk',
  endpoint: 'https://hb.ru-msk.vkcloud-storage.ru',
  credentials: {
    accessKeyId: process.env.VK_ACCESS_KEY!,
    secretAccessKey: process.env.VK_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, uploadId, partNumber, chunkBase64 } = req.body;

  if (!filename || !uploadId || !partNumber || !chunkBase64) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const body = Buffer.from(chunkBase64, 'base64');

    const command = new UploadPartCommand({
      Bucket: 'cse-contests',
      Key: filename,
      UploadId: uploadId,
      PartNumber: partNumber,
      Body: body,
    });

    const result = await s3.send(command);

    return res.status(200).json({
      etag: result.ETag?.replace(/"/g, '') || '',
    });
  } catch (error: any) {
    console.error('S3 UploadPart error:', error);
    return res.status(500).json({
      error: error.message || 'Upload part failed',
    });
  }
}
