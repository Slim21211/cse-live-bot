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

export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get('filename');
    const uploadId = url.searchParams.get('uploadId');
    const partNumber = url.searchParams.get('partNumber');

    if (!filename || !uploadId || !partNumber) {
      return new Response('Missing params', { status: 400 });
    }

    const body = new Uint8Array(await req.arrayBuffer());

    const result = await s3.send(
      new UploadPartCommand({
        Bucket: 'cse-contests',
        Key: decodeURIComponent(filename),
        UploadId: uploadId,
        PartNumber: Number(partNumber),
        Body: body,
      })
    );

    return new Response(
      JSON.stringify({ etag: result.ETag?.replace(/"/g, '') }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(e.message || 'Upload failed', { status: 500 });
  }
};
