import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | undefined;

function getClient() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey || !process.env.AWS_S3_BUCKET) {
    throw new Error("Object storage is not configured");
  }

  client ??= new S3Client({
    region: process.env.AWS_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT_URL,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export async function createUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn: 10 * 60 });
}

export async function objectExists(key: string) {
  await getClient().send(new HeadObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key }));
}

export async function createDownloadUrl(key: string) {
  const command = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key });
  return getSignedUrl(getClient(), command, { expiresIn: 5 * 60 });
}