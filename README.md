# Backend Setup Instructions

## Quick Start (Demo Mode - No SMS/WhatsApp)

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Server will run on:** `http://localhost:3001`

The server will work in **demo mode** without Twilio credentials. Bills will be logged to console instead of being sent.

---

## Production Setup (Real SMS/WhatsApp)

### Option 1: Using Twilio (Recommended)

#### Step 1: Sign up for Twilio
1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account (get $15-20 free credits)
3. Verify your phone number

#### Step 2: Get Credentials
1. Go to Twilio Console: https://console.twilio.com
2. Find your **Account SID** and **Auth Token**
3. Get a phone number:
   - Go to Phone Numbers → Manage → Buy a number
   - Choose a number with SMS capability
   - For India, you can get a number for ~₹500-1000/month

#### Step 3: Configure WhatsApp (Optional)
1. Go to Messaging → Try it out → Send a WhatsApp message
2. Follow instructions to connect WhatsApp sandbox
3. Send "join [your-code]" to the Twilio WhatsApp number from your phone
4. Use sandbox number: `whatsapp:+14155238886`

#### Step 4: Create .env file
```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
PORT=3001
```

#### Step 5: Restart Server
```bash
npm start
```

---

### Option 2: Using Fast2SMS (India - Cheaper)

#### Step 1: Sign up
1. Go to https://www.fast2sms.com
2. Sign up and verify your account
3. Add credits (₹500 minimum - gets ~2000 SMS)

#### Step 2: Get API Key
1. Go to Dashboard → API Keys
2. Copy your API key

#### Step 3: Add to .env
```env
FAST2SMS_API_KEY=your_api_key_here
```

#### Step 4: Update Frontend
In `Description.tsx`, change the fetch URL to:
```javascript
const response = await fetch('http://localhost:3001/api/send-bill-fast2sms', {
```

---

## Update Frontend to Use Backend

The frontend is already configured! Just make sure:

1. Backend server is running on `http://localhost:3001`
2. Frontend will automatically connect to `/api/send-bill`

If you need to change the URL, edit `Description.tsx`:
```javascript
const response = await fetch('http://localhost:3001/api/send-bill', {
```

---

## Testing

### Test in Demo Mode
1. Start backend: `npm start`
2. Use the Description page
3. Add products and create a bill
4. Check backend console - bill will be printed there

### Test with Real SMS
1. Configure Twilio credentials in `.env`
2. Restart backend
3. Create a bill with a real phone number
4. Customer will receive SMS/WhatsApp

---

## Phone Number Format

The backend automatically adds +91 (India) to phone numbers. To change:

Edit `server.js` line ~48:
```javascript
formattedPhone = `+1${formattedPhone}`; // For US
formattedPhone = `+44${formattedPhone}`; // For UK
```

---

## Troubleshooting

### "Twilio credentials not found"
- Check `.env` file exists in backend folder
- Verify credentials are correct
- Restart server after adding credentials

### "Failed to send message"
- Check phone number format
- Verify Twilio account has credits
- Check Twilio console for error messages
- For WhatsApp: Make sure recipient has joined sandbox

### "Cannot connect to backend"
- Make sure backend is running on port 3001
- Check frontend fetch URL is correct
- Check CORS is enabled (already configured)

---

## Cost Estimates

### Twilio
- SMS: ~₹0.50-1.00 per message
- WhatsApp: ~₹0.25-0.40 per message
- Monthly phone number: ~₹500-1000

### Fast2SMS
- SMS: ~₹0.15-0.25 per message
- No monthly fees
- Cheaper for India only

---

## Production Deployment

When deploying to production:

1. **Backend:** Deploy to Heroku, Railway, or AWS
2. **Environment Variables:** Set on hosting platform
3. **Update Frontend:** Change API URL to production backend
4. **Security:** 
   - Add rate limiting
   - Add authentication
   - Validate phone numbers
   - Add request logging

---

## Support

- Twilio Docs: https://www.twilio.com/docs
- Fast2SMS Docs: https://www.fast2sms.com/docs
- Express Docs: https://expressjs.com
