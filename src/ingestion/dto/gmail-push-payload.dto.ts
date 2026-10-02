/**
 * Shape of a Pub/Sub push message from Gmail watch.
 * body.message.data is base64 of the JSON {emailAddress, historyId}.
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
