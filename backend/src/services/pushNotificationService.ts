import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';
import { deviceTokenRepository } from '../repositories/deviceTokenRepository';

let isFirebaseInitialized = false;

try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.resolve(process.cwd(), '../firebase-configs/firebase-service-account.json');
    initializeApp({
        credential: cert(require(serviceAccountPath))
    });
    isFirebaseInitialized = true;
} catch (error) {
    console.warn('Firebase Admin initialization skipped (or failed). Push notifications will not be sent.', error);
}

export const pushNotificationService = {
    async sendPushNotification(receiverId: number, senderName: string, messagePreview: string) {
        if (!isFirebaseInitialized) return;

        try {
            const [rows] = await pool.execute<RowDataPacket[]>(
                `SELECT token FROM device_tokens WHERE user_id = ? AND platform = 'android'`,
                [receiverId]
            );

            if (!rows.length) return;

            const tokens = rows.map(r => r.token);

            const payload = {
                notification: {
                    title: `${senderName} sent you a message`,
                    body: messagePreview
                }
            };

            const response = await getMessaging().sendEachForMulticast({
                tokens,
                notification: payload.notification
            });

            // Handle invalid/stale tokens
            response.responses.forEach((res: any, index: number) => {
                if (!res.success && res.error) {
                    if (
                        res.error.code === 'messaging/invalid-registration-token' ||
                        res.error.code === 'messaging/registration-token-not-registered'
                    ) {
                        // Clean up stale token
                        deviceTokenRepository.deleteToken(tokens[index]).catch(console.error);
                    }
                }
            });
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }
};
