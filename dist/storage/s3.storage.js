"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Storage = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
class S3Storage {
    driver = 's3';
    client;
    bucket;
    region;
    publicBase;
    constructor(config) {
        this.bucket = config.bucket;
        this.region = config.region || 'us-east-1';
        this.publicBase = config.publicUrl
            ? config.publicUrl.replace(/\/+$/, '')
            : undefined;
        this.client = new client_s3_1.S3Client({
            region: this.region,
            endpoint: config.endpoint || undefined,
            forcePathStyle: config.forcePathStyle,
            credentials: config.accessKeyId && config.secretAccessKey
                ? {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                }
                : undefined,
        });
    }
    async save(key, buffer, opts) {
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: opts?.contentType,
        }));
        return { key, url: this.url(key) };
    }
    async remove(key) {
        await this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }
    async list(prefix) {
        const out = [];
        let token;
        do {
            const res = await this.client.send(new client_s3_1.ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
                ContinuationToken: token,
            }));
            for (const obj of res.Contents ?? []) {
                if (!obj.Key || obj.Key.endsWith('/'))
                    continue;
                out.push({ key: obj.Key, url: this.url(obj.Key) });
            }
            token = res.IsTruncated ? res.NextContinuationToken : undefined;
        } while (token);
        return out;
    }
    async rename(fromKey, toKey) {
        await this.client.send(new client_s3_1.CopyObjectCommand({
            Bucket: this.bucket,
            Key: toKey,
            CopySource: `/${this.bucket}/${fromKey}`,
        }));
        await this.client.send(new client_s3_1.DeleteObjectCommand({ Bucket: this.bucket, Key: fromKey }));
    }
    url(key) {
        if (this.publicBase)
            return `${this.publicBase}/${key}`;
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
}
exports.S3Storage = S3Storage;
//# sourceMappingURL=s3.storage.js.map