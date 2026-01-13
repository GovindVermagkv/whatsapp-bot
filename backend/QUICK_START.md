# Quick Start Guide

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `@whiskeysockets/baileys` - WhatsApp Web API
- `xlsx` - Excel file reading
- `csv-parser` - CSV file reading
- Other required dependencies

## Step 2: Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Step 3: Connect WhatsApp

1. When the server starts, you'll see a QR code in the terminal
2. Open WhatsApp on your phone
3. Go to **Settings → Linked Devices**
4. Tap **"Link a Device"**
5. Scan the QR code from the terminal
6. Wait for "✅ Connected to WhatsApp successfully!" message

**Note**: After first scan, your session is saved. You won't need to scan again unless you delete the `auth_info_baileys/` folder.

## Step 4: Prepare Your Excel/CSV File

Create a file with these columns:

| number | name | message |
|--------|------|---------|
| 919876543210 | John Doe | Hello {{name}}, your order is confirmed |
| 919876543211 | Jane Smith | Hi {{name}}, thanks! |

**Required**: `number` column (or phone, mobile, contact)  
**Optional**: `name`, `message` columns

See `example_contacts.xlsx` for a sample file.

## Step 5: Send Messages

### Option A: Using the Frontend
1. Open the frontend (usually `http://localhost:5173`)
2. Upload your Excel/CSV file
3. Enter a custom message (optional, uses `{{name}}` for personalization)
4. Click "Send Messages"

### Option B: Using API

**Check connection:**
```bash
curl http://localhost:5000/api/status
```

**Send test message:**
```bash
curl -X POST http://localhost:5000/api/send-test-message \
  -H "Content-Type: application/json" \
  -d '{"number": "919876543210", "message": "Hello, test message!"}'
```

**Send bulk messages:**
```bash
curl -X POST http://localhost:5000/api/send-messages \
  -F "csvFile=@your_file.xlsx" \
  -F "customMessage=Hello {{name}}, your order is confirmed!"
```

## Troubleshooting

### QR Code Not Showing
- Make sure your terminal supports QR codes
- Try a different terminal (Windows Terminal, iTerm2, etc.)

### Connection Issues
- Check if WhatsApp is connected: `GET /api/status`
- If logged out, delete `auth_info_baileys/` folder and restart
- Make sure your phone has internet connection

### Messages Not Sending
- Verify phone numbers include country code
- Check server logs for error messages
- Ensure numbers are registered on WhatsApp

### Invalid Numbers
- Format: `countrycode + number` (e.g., `919876543210` for India)
- 10-digit numbers automatically get +91 (India) prefix
- For other countries, include full country code

## Example Excel File

See `example_contacts.xlsx` in the backend folder for a complete example.

## Next Steps

- Read `README_BAILEYS.md` for detailed documentation
- Customize message templates with variables
- Add image attachments (optional)
- Configure rate limiting delays

## Support

For issues:
1. Check server logs
2. Verify file format matches examples
3. Test with a single number first
4. Review `README_BAILEYS.md` for detailed info

