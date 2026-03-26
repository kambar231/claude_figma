# Belo Privacy Policy

**Last Updated: March 25, 2026**

## 1. Introduction

Belo ("we," "us," or "our") is a private messaging application. This Privacy Policy explains what information we collect, how we use it, and the choices you have. We are committed to protecting your privacy and use end-to-end encryption to secure your messages.

This policy applies to the Belo mobile application and all related services. By using Belo, you agree to the collection and use of information as described in this policy. If you do not agree, please do not use the app.

For questions about this policy, see Section 17 (Contact Us).

## 2. Legal Basis for Processing Personal Data

We process your personal data based on the following legal grounds:

- **Contract performance** — processing necessary to provide the Belo messaging service you signed up for (delivering messages, enabling calls, managing your account).
- **Legitimate interests** — processing necessary for security, fraud prevention, and service improvement, where our interests do not override your rights.
- **Consent** — where you have given explicit consent for specific processing (e.g., optional profile information, enabling notifications).
- **Legal obligation** — processing required to comply with applicable laws.

If you are in the European Economic Area (EEA) or United Kingdom, Belo Network Ltd acts as the data controller for your personal data.

## 3. Information We Collect

### 3.1 Account Information

When you create a Belo account, we collect:

- **Phone number** — used for account registration and verification via SMS.
- **Display name and username** — chosen by you for your profile.
- **Profile photo** — optional, uploaded by you.
- **Bio** — optional, written by you.

### 3.2 Messages and Content

- **Messages** — text messages you send and receive are end-to-end encrypted using the Signal protocol (X25519 + Ed25519). We cannot read your message content.
- **Media** — photos, videos, voice messages, audio recordings, and files you share in conversations are encrypted in transit.
- **Pops** — ephemeral status updates you create, including text and media, with your chosen visibility settings (all contacts, close friends, or golden circle).
- **Notes** — notes you create within conversations.
- **Reactions and replies** — emoji reactions and message replies.
- **Flows** — group spaces you create or join, including flow name, description, avatar, and membership.

### 3.3 Contacts

- **Contact list** — Belo maintains a contacts list within the app. When you add contacts, we store those relationships on our servers to enable messaging.
- **Contact preferences** — nicknames you assign, favorite and blocked status.
- We do **not** upload or scan your device's phone address book.

### 3.4 Usage Information

- **Message metadata** — delivery and read receipt timestamps, message status (sent, delivered, read). You can disable read receipts in settings.
- **Online status** — your online/offline status and last seen timestamp.
- **GIF search queries** — when you search for GIFs, queries are sent to our servers to fetch results from Tenor. These queries are transient, not stored, and not linked to your account.
- **Link previews** — when you send a URL, our server may fetch a preview (title, image) for display purposes.

### 3.5 Device Information

- **Device ID** — a randomly generated unique identifier for your device, used for push notifications and authentication.
- **Platform type** — whether you use iOS or Android, used to deliver push notifications correctly.
- **Push notification token** — your Firebase Cloud Messaging (FCM) or Apple Push Notification service (APNs) token, used solely to deliver notifications to your device.

### 3.6 Calls and Peek

- **Call metadata** — call type (audio/video), participants, and duration. Call audio and video streams are transmitted peer-to-peer (WebRTC) or via LiveKit for group calls and are not stored on our servers.
- **Peek sessions** — real-time video previews use the same infrastructure as calls. Streams are not recorded or stored.

### 3.7 Cookies and Local Storage

Belo is a mobile application and does not use browser cookies. Local data is stored on your device using:

- **Encrypted storage** (iOS Keychain / Android EncryptedSharedPreferences) for authentication tokens and encryption keys.
- **Local database** for cached messages and conversations, enabling offline access.
- **Shared preferences** for your app settings (theme, notification preferences, text scale).

No tracking cookies or advertising identifiers are used.

## 4. Information We Do NOT Collect

- **Location data** — we do not access your GPS or location.
- **Device contacts/address book** — we do not upload or scan your phone's contact list.
- **Financial or payment information** — we do not process payments.
- **Advertising identifiers** — we do not collect IDFA, GAID, or any ad tracking identifiers.
- **Analytics or diagnostics** — we do not use third-party analytics SDKs (no Google Analytics, Mixpanel, Amplitude, or similar).
- **Browsing history** — we do not track your activity outside the app.

## 5. How We Use Your Information

We use the information we collect to:

- **Provide the service** — deliver messages, enable calls, sync contacts, and display profiles.
- **Send notifications** — deliver push notifications for new messages, calls, and other activity.
- **Authenticate your account** — verify your phone number and manage login sessions.
- **Ensure safety and security** — prevent fraud, spam, abuse, and unauthorized access. This may include reviewing reported content and taking action against accounts that violate our Terms of Service.
- **Enable cross-device functionality** — keep your conversations accessible when you switch devices (account data and encryption key re-establishment).
- **Improve the service** — fix bugs and improve performance (using aggregated, non-identifiable data only).

We do NOT use your information for:

- Advertising or ad targeting
- Selling to third parties
- Profiling or behavioral tracking
- Training AI or machine learning models

## 6. End-to-End Encryption

Belo uses end-to-end encryption (E2EE) based on the Signal protocol for all direct messages. This means:

- Messages are encrypted on your device before being sent.
- Only you and the intended recipient can read message content.
- We cannot read, access, or decrypt your messages.
- Encryption keys are generated and stored locally on your device in secure storage (iOS Keychain / Android EncryptedSharedPreferences).
- Key exchange uses X25519 Diffie-Hellman with Ed25519 signing, including identity keys, signed pre-keys, and one-time pre-keys.

## 7. Data Sharing

### 7.1 Other Belo Users

When you use Belo, certain information is visible to people you communicate with:

- Your display name, username, profile photo, and bio.
- Your online status and last seen (unless disabled in settings).
- Messages and media you send to them.
- Read receipts (unless disabled in settings).

Users you communicate with may save, copy, or share the content you send them outside of Belo. We cannot control how recipients use content after delivery.

### 7.2 Third-Party Service Providers

We use the following third-party services to operate Belo:

| Provider | Purpose | Data Shared |
|----------|---------|-------------|
| **Firebase Authentication** (Google) | Phone number verification | Phone number |
| **Firebase Cloud Messaging** (Google) | Push notification delivery | Device token, platform type |
| **LiveKit** | Group video/audio calls | Call streams (real-time, not stored) |
| **Tenor** (Google) | GIF search | Search queries (not linked to identity) |

These providers process data only as necessary to provide their services and are bound by their own privacy policies.

### 7.3 Corporate Structure

Belo is operated by Belo Network Ltd. Your data may be shared within our corporate group for the purposes described in this policy. Any affiliated companies are bound by the same data protection obligations.

### 7.4 Law Enforcement

We may disclose information if required by law, valid court order, or legal process. Because messages are end-to-end encrypted, we cannot provide message content even if legally compelled to do so.

Information we can provide, if legally required:

- Account information (phone number, display name, username, profile photo)
- Device tokens and platform type
- Account creation and last login timestamps

We will evaluate each request on its merits and may challenge requests we believe are overly broad or unlawful. We will notify affected users unless prohibited by law.

### 7.5 Assignment and Change of Control

In the event of a merger, acquisition, reorganization, or sale of assets, your personal data may be transferred to the successor entity. We will notify you of any such change and any choices you may have regarding your data.

### 7.6 We Do NOT

- Sell your personal data to anyone
- Share data with data brokers
- Share data for advertising purposes
- Transfer data for purposes unrelated to operating Belo

## 8. Keeping Your Data Safe

### 8.1 Infrastructure Security

- All network communications use TLS encryption.
- Sensitive data is stored using encrypted storage mechanisms on both client and server.
- Authentication uses secure token-based sessions with automatic expiration and refresh.

### 8.2 End-to-End Encrypted Data

Message content in direct conversations is encrypted with keys that only exist on participants' devices. We have no ability to decrypt this data.

### 8.3 Local Device Security

Encryption keys, authentication tokens, and sensitive credentials are stored in your device's secure enclave (iOS Keychain / Android EncryptedSharedPreferences). Message history is cached in a local encrypted database.

## 9. Data Retention

- **Account data** — retained while your account is active. Deleted when you delete your account.
- **Messages on server** — retained only until delivery, then removed from our servers.
- **Messages on device** — stored locally on your device; you can delete them at any time.
- **Disappearing messages** — automatically deleted after the expiration time you set.
- **Pops** — automatically expire and are deleted after the set duration.
- **Push notification tokens** — deleted from our servers when you log out.
- **Security metadata** — IP addresses and device information associated with your account may be retained for up to 12 months for safety and anti-abuse purposes.
- **Account inactivity** — accounts that remain inactive for an extended period may be subject to automatic deletion. We will attempt to notify you before deleting an inactive account.

## 10. Your Rights and Choices

### 10.1 In-App Controls

You can directly control:

- **Profile information** — edit your display name, username, profile photo, and bio at any time.
- **Read receipts** — enable or disable in settings.
- **Online status** — manage your visibility settings.
- **Notifications** — mute individual conversations or adjust notification preferences.
- **Blocked users** — block or unblock users to control who can contact you.
- **Message deletion** — delete messages from your device.
- **Disappearing messages** — set auto-delete timers on conversations.

### 10.2 Account Deletion

You can permanently delete your account at any time. This will:

- Remove your account information from our servers.
- Delete your profile, contacts, and all associated data.
- Remove your push notification tokens.
- This action is permanent and cannot be undone.

### 10.3 Data Access and Portability

You have the right to:

- **Request a copy** of your personal data we hold.
- **Request correction** of inaccurate data.
- **Request deletion** of specific data.
- **Request restriction** of processing in certain circumstances.
- **Object to processing** based on legitimate interests.
- **Data portability** — receive your data in a structured, machine-readable format.

To exercise these rights, contact us at the address in Section 17.

### 10.4 EEA, UK, and Other Jurisdictions

If you are in a jurisdiction with data protection laws (such as GDPR, UK GDPR, or similar), you have the right to lodge a complaint with your local data protection supervisory authority.

## 11. Safety, Spam, and Abuse

To keep Belo safe for all users:

- Users can report accounts and content that violate our Terms of Service.
- Reported content may be reviewed by our moderation team to take appropriate action (warnings, restrictions, or account termination).
- We may use automated systems to detect spam, phishing, and abuse patterns based on metadata (not message content, which is encrypted).
- Accounts confirmed as spam or abusive may be restricted or removed.

## 12. Third-Party Links and Services

Belo may display previews of links shared in conversations. These link previews are generated by our servers and do not share your identity with the linked website. When you tap a link to open it, you leave Belo and are subject to that website's privacy policy.

## 13. Children's Privacy

Belo is not intended for children under the age of 13 (or the applicable minimum age in your jurisdiction). We do not knowingly collect personal information from children. If we learn that we have collected data from a child under the applicable age, we will take steps to delete it promptly. If you believe a child has provided us with personal data, please contact us at the address in Section 17.

## 14. International Data Transfers

Your information may be transferred to and processed in countries other than your own. When we transfer personal data outside the EEA or UK, we ensure appropriate safeguards are in place, such as:

- Standard Contractual Clauses (SCCs) approved by the European Commission.
- Adequacy decisions where applicable.
- Other appropriate safeguards as required by applicable law.

## 15. U.S. State Privacy Rights

If you are a resident of California, Virginia, Colorado, Connecticut, Utah, or other U.S. states with consumer privacy laws, you may have additional rights including:

- The right to know what personal information we collect and how it is used.
- The right to request deletion of your personal information.
- The right to opt out of the sale of personal information (we do not sell your data).
- The right to non-discrimination for exercising your privacy rights.

To exercise these rights, contact us at the address in Section 17.

## 16. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of material changes by:

- Posting the updated policy within the app.
- Sending a notification through the app for significant changes.
- Updating the "Last Updated" date at the top of this policy.

Your continued use of Belo after changes are posted constitutes your acceptance of the updated policy. We encourage you to review this policy periodically.

### Change History

| Date | Changes |
|------|---------|
| March 25, 2026 | Initial privacy policy published. |

## 17. Contact Us

If you have questions about this Privacy Policy, want to exercise your data rights, or have concerns about our data practices, contact us at:

**Email:** privacy@belo.network

**Website:** https://belo.network

For EEA/UK residents, you may also contact our data protection representative at:

**Email:** dpo@belo.network

---

*This privacy policy was last updated on March 25, 2026.*
