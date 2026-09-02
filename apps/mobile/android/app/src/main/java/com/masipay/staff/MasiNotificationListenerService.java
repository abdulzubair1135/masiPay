package com.masipay.staff;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.os.Bundle;
import android.util.Log;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MasiNotificationListenerService extends NotificationListenerService {
    private static final String TAG = "MasiNotifyListener";
    private static final String WEBHOOK_URL = "https://masipay.onrender.com/api/payments/auto-verify-webhook";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;

        CharSequence titleChar = extras.getCharSequence("android.title");
        CharSequence textChar = extras.getCharSequence("android.text");
        CharSequence bigTextChar = extras.getCharSequence("android.bigText");

        String title = titleChar != null ? titleChar.toString() : "";
        String text = textChar != null ? textChar.toString() : "";
        String bigText = bigTextChar != null ? bigTextChar.toString() : "";
        String combined = title + " " + text + " " + bigText;

        // Filter UPI & Payment Apps: GPay, PhonePe, Paytm, BHIM, Axis, BOB, SMS
        boolean isPaymentApp = packageName.contains("paisa") || // Google Pay
                               packageName.contains("phonepe") || 
                               packageName.contains("paytm") || 
                               packageName.contains("bhim") ||
                               packageName.contains("axis") ||
                               packageName.contains("mms") ||
                               packageName.contains("messaging") ||
                               packageName.contains("truecaller") ||
                               combined.toLowerCase().contains("credited") ||
                               combined.toLowerCase().contains("paid you") ||
                               combined.toLowerCase().contains("received");

        if (isPaymentApp && (combined.toLowerCase().contains("inr") || combined.contains("₹") || combined.toLowerCase().contains("rs") || combined.toLowerCase().contains("paid"))) {
            Log.d(TAG, "Captured Payment Notification from " + packageName + ": " + combined);
            sendWebhookBackground(combined, packageName);
        }
    }

    private void sendWebhookBackground(final String text, final String sourcePkg) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(WEBHOOK_URL);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; utf-8");
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);

                    JSONObject json = new JSONObject();
                    json.put("text", text);
                    json.put("source", sourcePkg);
                    json.put("secretKey", "MASI_AUTO_SYNC_SECRET_2026");

                    String jsonString = json.toString();
                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonString.getBytes(StandardCharsets.UTF_8);
                        os.write(input, 0, input.length);
                    }

                    int code = conn.getResponseCode();
                    Log.d(TAG, "Webhook HTTP Response Code: " + code);
                    conn.disconnect();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to send notification webhook: " + e.getMessage());
                }
            }
        }).start();
    }
}
