const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());

// Fast2SMS configuration
const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
const smsEnabled = !!fast2smsApiKey;

if (smsEnabled) {
  console.log('✅ Fast2SMS configured - Real SMS will be sent');
} else {
  console.log('📱 Running in DEMO mode - SMS will be simulated (no API key needed)');
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'SuperMarket SMS Bill API',
    mode: smsEnabled ? 'production' : 'demo',
    smsProvider: 'Fast2SMS',
    configured: smsEnabled,
    publicUrl: PUBLIC_BASE_URL
  });
});

// Serve bill HTML endpoint
app.get('/bill/:invoiceId', (req, res) => {
  const { invoiceId } = req.params;
  const invoiceFile = path.join(__dirname, `invoice-${invoiceId}.html`);
  
  // Check if invoice file exists
  if (fs.existsSync(invoiceFile)) {
    res.sendFile(invoiceFile);
  } else {
    // Return a generic bill not found page
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice Not Found</title>
        <style>
          body { font-family: Arial; text-align: center; padding: 50px; }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>📄 Invoice Not Found</h1>
        <p>Invoice ${invoiceId} could not be found.</p>
        <p>Please contact the store if you believe this is an error.</p>
      </body>
      </html>
    `);
  }
});

// Send bill endpoint using Fast2SMS
app.post('/api/send-bill', async (req, res) => {
  const { customerName, customerPhone, billText, items, total, invoiceNumber } = req.body;

  console.log('\n📧 New Bill SMS Request:');
  console.log('Customer:', customerName);
  console.log('Phone:', customerPhone);
  console.log('Invoice:', invoiceNumber);
  console.log('Total:', total);
  
  // Generate public bill link
  const billLink = `${PUBLIC_BASE_URL}/bill/${invoiceNumber}`;
  console.log('Bill Link:', billLink);

  // Validate input
  if (!customerName || !customerPhone || !billText) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['customerName', 'customerPhone', 'billText']
    });
  }

  // Clean phone number (remove +91 if present, Fast2SMS expects 10 digits)
  let cleanPhone = customerPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.slice(2);
  }
  
  // Create SMS message with public bill link
  const smsMessage = `
🧾 SUPERMARKET INVOICE

Invoice: ${invoiceNumber}
Customer: ${customerName}
Total: ₹${total}

View Full Bill:
${billLink}

Thank you for shopping with us!`;

  try {
    if (!smsEnabled) {
      // Demo mode - simulate success (NO API KEY NEEDED)
      console.log('📱 DEMO MODE - SMS Bill Preview:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(smsMessage);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Would be sent to: ${cleanPhone}`);
      console.log('Customer:', customerName);
      console.log('Invoice:', invoiceNumber);
      console.log('Amount: ₹' + total);
      console.log('✅ SMS simulated successfully!\n');
      
      // Simulate slight delay like real SMS
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return res.json({ 
        success: true, 
        demo: true,
        message: 'SMS sent successfully (demo mode)',
        messageId: 'DEMO-' + Date.now(),
        billLink: billLink,
        timestamp: new Date().toISOString()
      });
    }

    // Real SMS via Fast2SMS
    console.log('📱 Sending REAL SMS via Fast2SMS...');
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'q',
      message: smsMessage,
      language: 'english',
      flash: 0,
      numbers: cleanPhone
    }, {
      headers: {
        'authorization': fast2smsApiKey
      }
    });
    
    console.log('✅ SMS sent successfully via Fast2SMS');
    console.log('Response:', response.data);
    
    res.json({ 
      success: true,
      demo: false,
      messageId: response.data.message_id || Date.now().toString(),
      status: 'sent',
      provider: 'Fast2SMS',
      billLink: billLink,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message,
      provider: 'Fast2SMS'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 SMS Bill Backend Server');
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`🌐 Public URL: ${PUBLIC_BASE_URL}`);
  console.log(`📱 SMS Provider: Fast2SMS`);
  console.log(`📱 Mode: ${smsEnabled ? 'PRODUCTION (Real SMS)' : 'DEMO (Simulated SMS)'}`);
  
  if (smsEnabled) {
    console.log('\n✅ Fast2SMS is active - Bills will be sent via SMS');
    console.log('💡 SMS will be sent to customer phone numbers\n');
  } else {
    console.log('\n💡 Demo Mode - To enable real SMS:');
    console.log('   1. Sign up at https://www.fast2sms.com');
    console.log('   2. Add API key to .env file');
    console.log('   3. Restart server\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Server shutting down...');
  process.exit(0);
});
