import sharp from 'sharp';
import { s3 } from '../lib/s3.js';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export async function processPostImages(buffer: Buffer) {
  const thumbnailBuffer = await sharp(buffer)
    .resize({
      width: 800,
      height: 425,
    })
    .toFormat('webp')
    .toBuffer();

  const coverImageBuffer = await sharp(buffer).toFormat('webp').toBuffer();

  return { thumbnailBuffer, coverImageBuffer };
}

export async function uploadImage(bucket: string, key: string, body: Buffer) {
  s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
    }),
  );
}

export async function deleteImage(bucket: string, key: string) {
  s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
