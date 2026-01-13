# WhatsApp Bot with Baileys

This project uses **@whiskeysockets/baileys** for WhatsApp automation, replacing Venom-Bot for better reliability and multi-device support.

## Features

✅ **Multi-device support** - Works with WhatsApp multi-device  
✅ **Session persistence** - QR scan once, reconnect automatically  
✅ **Bulk messaging** - Send messages to multiple contacts from Excel/CSV  
✅ **Personalized messages** - Support for variables like `{{name}}`, `{{number}}`  
✅ **Rate limiting** - Automatic delays between messages (3-5 seconds)  
✅ **Error handling** - Skips invalid numbers and continues processing  
✅ **Excel/CSV support** - Read contacts from both formats  

## Installation

1. Install dependencies:
```bash
npm install
```

2. The required packages are:
- `@whiskeysockets/baileys` - WhatsApp Web API
- `xlsx` - Excel file reading
- `csv-parser` - CSV file reading
- `pino` - Logging (used by Baileys)

## First Time Setup

1. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

2. **Scan QR Code**: When you first run the server, a QR code will appear in the terminal. 
   - Open WhatsApp on your phone
   - Go to Settings → Linked Devices
   - Tap "Link a Device"
   - Scan the QR code shown in the terminal

3. **Session Saved**: After scanning, your session is saved in `auth_info_baileys/` folder.
   - You won't need to scan again unless you delete this folder
   - The session persists across server restarts

## Excel File Format

Create an Excel file (`.xlsx`) or CSV file (`.csv`) with the following columns:

| number | name | message |
|--------|------|---------|
| 919876543210 | John Doe | Hello {{name}}, your order #12345 is confirmed |
| 919876543211 | Jane Smith | Hi {{name}}, thanks for your purchase! |

### Required Columns:
- **number** (or phone, mobile, contact) - Phone number with country code
  - Example: `919876543210` (India: 91 + 10 digits)
  - Example: `1234567890` (will auto-add country code if 10 digits)

### Optional Columns:
- **name** (or fullname, customer_name) - Contact name for personalization
- **message** (or msg, text, content) - Per-row custom message (if not using global message)

### Message Variables:
Use `{{variable}}` syntax in your messages:
- `{{name}}` - Replaced with contact name
- `{{number}}` - Replaced with phone number
- `{{column_name}}` - Replaced with any other column value

### Example Messages:
```
Hello {{name}}, your order is confirmed!
Hi {{name}}, your appointment is on {{date}}
Welcome {{name}}! Your account number is {{account}}
```

## API Endpoints

### 1. Check Connection Status
```http
GET /api/status
```

Response:
```json
{
  "success": true,
  "connected": true,
  "ready": true,
  "state": "connected"
}
```

### 2. Send Test Message
```http
POST /api/send-test-message
Content-Type: application/json

{
  "number": "919876543210",
  "message": "Hello, this is a test message!"
}
```

### 3. Send Bulk Messages from Excel/CSV
```http
POST /api/send-messages
Content-Type: multipart/form-data

csvFile: [Excel or CSV file]
customMessage: "Hello {{name}}, your order is confirmed!"
imageFile: [Optional image file]
```

Response:
```json
{
  "success": true,
  "message": "Messages processed successfully",
  "statistics": {
    "total": 10,
    "sent": 8,
    "failed": 1,
    "invalid": 1
  },
  "results": [...]
}
```

### 4. Validate File Structure
```http
POST /api/validate-file
Content-Type: multipart/form-data

csvFile: [Excel or CSV file]
```

## Phone Number Format

The bot automatically formats phone numbers to WhatsApp JID format:
- Input: `9876543210` (10 digits) → Output: `919876543210@s.whatsapp.net` (assumes India +91)
- Input: `919876543210` → Output: `919876543210@s.whatsapp.net`
- Input: `+919876543210` → Output: `919876543210@s.whatsapp.net`

**Note**: For numbers without country code, the bot assumes Indian numbers (+91). 
For other countries, include the full country code.

## Rate Limiting

The bot automatically adds delays between messages:
- Default: 3-5 seconds (randomized)
- Prevents rate limiting from WhatsApp
- Can be customized in `sendBulkMessagesFromExcel()` method

## Error Handling

The bot handles various error scenarios:
- **Invalid numbers**: Marked as "invalid" and skipped
- **Not registered**: Numbers not on WhatsApp are skipped
- **Rate limits**: Automatic retry with backoff
- **Connection issues**: Automatic reconnection

## Folder Structure

```
backend/
├── baileysBot.js          # Main Baileys WhatsApp service
├── server.js              # Express API server
├── package.json           # Dependencies
├── auth_info_baileys/     # Session storage (auto-created)
│   ├── creds.json
│   └── keys/
└── uploads/               # Temporary file uploads
```

## Troubleshooting

### QR Code Not Appearing
- Make sure terminal supports QR code display
- Check that `printQRInTerminal: true` is set in `baileysBot.js`

### Connection Drops
- The bot automatically reconnects on connection loss
- If logged out, delete `auth_info_baileys/` folder and scan QR again

### Messages Not Sending
- Check connection status: `GET /api/status`
- Verify phone numbers are in correct format
- Check server logs for error messages

### Invalid Numbers
- Ensure numbers include country code
- Verify numbers are registered on WhatsApp
- Check Excel/CSV file format

## Security Notes

⚠️ **Important**:
- Keep `auth_info_baileys/` folder secure - it contains your WhatsApp session
- Don't commit session files to version control
- Use this for educational/internal automation only
- Respect WhatsApp's terms of service
- Don't spam or send unsolicited messages

## Migration from Venom-Bot

If you were using Venom-Bot before:
1. ✅ All functionality is preserved
2. ✅ API endpoints remain the same
3. ✅ Excel/CSV format is the same
4. ✅ Session is stored in `auth_info_baileys/` instead of `tokens/`

## Support

For issues or questions:
- Check Baileys documentation: https://github.com/WhiskeySockets/Baileys
- Review server logs for error messages
- Verify file formats match examples

## License

MIT License - Use responsibly!

