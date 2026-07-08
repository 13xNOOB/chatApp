import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import path from 'path';
import { pool } from '../config/database';
import { RowDataPacket } from 'mysql2/promise';

async function testFcm() {
    try {
        // 1. Parse arguments
        const args = process.argv.slice(2);
        const userIdArg = args.find(arg => arg.startsWith('--userId='));
        if (!userIdArg) {
            console.error('Usage: npm run test:fcm -- --userId=<id>');
            process.exit(1);
        }
        
        const userId = parseInt(userIdArg.split('=')[1], 10);
        if (isNaN(userId)) {
            console.error('Invalid userId provided.');
            process.exit(1);
        }

        console.log(`[FCM Test] Starting test for userId: ${userId}`);

        // 2. Initialize Firebase Admin
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.resolve(process.cwd(), '../firebase-configs/firebase-service-account.json');
        try {
            initializeApp({
                credential: cert(require(serviceAccountPath))
            });
            console.log('[FCM Test] Firebase Admin initialized successfully.');
        } catch (err: any) {
            console.error('[FCM Test] Failed to initialize Firebase Admin. Reason:', err?.message || 'Unknown error');
            console.error('[FCM Test] Please check if firebase-configs/firebase-service-account.json exists and is valid.');
            process.exit(1);
        }

        // 3. Query MySQL for the token
        console.log(`[FCM Test] Querying latest android token for user ${userId}...`);
        const [rows] = await pool.execute<RowDataPacket[]>(
            `SELECT id, user_id, platform, token FROM device_tokens 
             WHERE user_id = ? AND platform = 'android' 
             ORDER BY updated_at DESC, id DESC LIMIT 1`,
            [userId]
        );

        if (!rows.length) {
            console.log(`[FCM Test] No android token found for user ${userId}.`);
            process.exit(0);
        }

        const device = rows[0];
        const tokenPrefix = device.token ? device.token.substring(0, 15) + '...' : 'INVALID';
        
        console.log(`[FCM Test] Found Token: ID=${device.id}, User=${device.user_id}, Platform=${device.platform}, Prefix=${tokenPrefix}`);

        // 4. Construct payload
        const payload: Message = {
            token: device.token,
            notification: {
                title: "FCM Test",
                body: "Test notification from Abroad Inquiry backend"
            },
            data: {
                type: "test_fcm",
                userId: String(userId)
            },
            android: {
                priority: "high"
            }
        };

        // 5. Send message
        console.log(`[FCM Test] Sending FCM message...`);
        try {
            const messageId = await getMessaging().send(payload);
            console.log(`[FCM Test] Success! Message ID: ${messageId}`);
        } catch (sendError: any) {
            console.error(`[FCM Test] Failed to send message. Error Code:`, sendError?.code);
            console.error(`[FCM Test] Error Message:`, sendError?.message);
            
            if (
                sendError?.code === 'messaging/invalid-registration-token' ||
                sendError?.code === 'messaging/registration-token-not-registered'
            ) {
                console.log(`[FCM Test] Recommendation: This token is stale or invalid. Consider running:`);
                console.log(`[FCM Test] DELETE FROM device_tokens WHERE id = ${device.id};`);
            }
        }
        
    } catch (err: any) {
        console.error(`[FCM Test] Unexpected error:`, err?.message || err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

testFcm();
