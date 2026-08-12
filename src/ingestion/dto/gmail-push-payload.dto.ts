/**
 * Shape của message Pub/Sub push từ Gmail watch.
 * body.message.data là base64 của JSON {emailAddress, historyId}.
 */
export interface GmailPushMessage {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
}

export interface GmailPushPayload {
  emailAddress: string;
  historyId: number;
}
