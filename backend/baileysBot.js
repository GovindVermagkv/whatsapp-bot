/**
 * WhatsApp Bot Service using Baileys
 * Replaces Venom-Bot with @whiskeysockets/baileys for better reliability
 * 
 * Features:
 * - Multi-device support
 * - Session persistence (QR scan once)
 * - Bulk messaging from Excel
 * - Personalized messages with variable substitution
 * - Rate limiting and error handling
 */

// Baileys is an ES module, so we need to use dynamic import
let makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers;

const pino = require('pino');
const XLSX = require('xlsx');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Initialize Baileys modules (will be loaded on first use)
let baileysLoaded = false;
async function loadBaileys() {
  if (!baileysLoaded) {
    const baileys = await import('@whiskeysockets/baileys');
    makeWASocket = baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;
    makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
    Browsers = baileys.Browsers;
    baileysLoaded = true;
  }
}

/**
 * WhatsApp Bot Service Class
 * Handles connection, messaging, and bulk operations
 */
class BaileysBot {
  constructor() {
    this.sock = null;
    this.isReady = false;
    this.isConnecting = false;
    this.authDir = path.join(__dirname, 'auth_info_baileys');
    this.connectionState = 'disconnected';
    this.qr = null; // Store QR code
    
    // Ensure auth directory exists
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
    
    console.log('🔄 BaileysBot Class Initialized');
  }

  /**
   * Format phone number to WhatsApp JID format
   * Converts: countrycode + number -> countrycode+number@s.whatsapp.net
   * 
   * @param {string} number - Phone number (with or without country code)
   * @returns {string} - Formatted JID
   */
  formatPhoneNumber(number) {
    // Remove all non-digit characters
    let clean = number.replace(/[^\d]/g, '');
    
    // If number starts with +, remove it
    if (clean.startsWith('+')) {
      clean = clean.substring(1);
    }
    
    // If length is 10, assume Indian number and prepend 91
    if (clean.length === 10) {
      clean = '91' + clean;
    }
    
    // Return in JID format: countrycode+number@s.whatsapp.net
    return clean + '@s.whatsapp.net';
  }

  /**
   * Connect to WhatsApp using Baileys
   * Handles QR code generation, authentication, and connection state
   * 
   * @returns {Promise<Object>} - Socket instance
   */
  async connectWhatsApp() {
    if (this.isConnecting) {
      console.log('⏳ Connection already in progress...');
      return this.sock;
    }

    if (this.sock && this.isReady) {
      console.log('✅ Already connected to WhatsApp');
      return this.sock;
    }

    this.isConnecting = true;

    try {
      console.log('🚀 Initializing Baileys WhatsApp connection...');

      // Load Baileys modules (ES module)
      await loadBaileys();

      // Load authentication state
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      
      // Fetch latest version
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📦 Using Baileys version ${version.join('.')}, isLatest: ${isLatest}`);

      // Create socket connection
      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }), // Set to 'debug' for verbose logging
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'error' })),
        },
        browser: Browsers.macOS('Desktop'), // Browser info for WhatsApp
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
      });

      // Save credentials when updated
      this.sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin, isOnline } = update;

        // Log all connection updates for debugging
        if (connection) {
          console.log(`📡 Connection update: ${connection}${isOnline !== undefined ? `, isOnline: ${isOnline}` : ''}${isNewLogin !== undefined ? `, isNewLogin: ${isNewLogin}` : ''}`);
        }

        if (qr) {
          // QR code generated - store it and display in terminal
          this.qr = qr;
          try {
            const qrcode = require('qrcode-terminal');
            console.log('\n📱 Scan the QR code below with your WhatsApp:');
            console.log('(Open WhatsApp → Settings → Linked Devices → Link a Device)\n');
            qrcode.generate(qr, { small: true });
            console.log('\n');
          } catch (error) {
            // Fallback if qrcode-terminal not available
            console.log('\n📱 QR Code generated. Please scan with WhatsApp:');
            console.log('QR String (first 100 chars):', qr.substring(0, 100) + '...\n');
            console.log('Full QR: Visit https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qr) + '\n');
          }
        }

        if (connection === 'close') {
          // Connection closed
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          
          console.log('❌ Connection closed:', lastDisconnect?.error?.message || lastDisconnect?.error);
          
          if (shouldReconnect) {
            console.log('🔄 Attempting to reconnect...');
            this.isReady = false;
            this.connectionState = 'disconnected';
            this.sock = null;
            this.isConnecting = false;
            // Retry connection after 3 seconds
            setTimeout(() => this.connectWhatsApp(), 3000);
          } else {
            console.log('❌ Logged out or fatal error:', lastDisconnect?.error?.message);
            
            // Auto-recovery logic
            console.log('🔄 Auto-recovering: Deleting auth data and restarting...');
            try {
              // specific error check for Stream Errored - this often requires re-auth
              if (fs.existsSync(this.authDir)) {
                fs.rmSync(this.authDir, { recursive: true, force: true });
                console.log('🗑️ Deleted auth directory.');
              }
            } catch (err) {
              console.error('⚠️ Failed to delete auth directory:', err);
            }

            this.isReady = false;
            this.connectionState = 'disconnected';
            this.sock = null;
            this.isConnecting = false;
            
            // Reconnect immediately to generate new QR
            console.log('🚀 Restarting connection process...');
            setTimeout(() => this.connectWhatsApp(), 1000);
          }
        } else if (connection === 'open') {
          // Connection successful
          console.log('✅ Connected to WhatsApp successfully!');
          this.isReady = true;
          this.connectionState = 'connected';
          this.isConnecting = false;
          this.qr = null; // Clear QR code on success
        } else if (connection === 'connecting') {
          if (this.connectionState !== 'connecting') {
            console.log('⏳ Connecting to WhatsApp...');
          }
          this.connectionState = 'connecting';
        }
      });

      // Check if already connected (in case connection was established before listener was set)
      // Wait a moment for any pending connection updates
      setTimeout(() => {
        if (this.sock && !this.isReady) {
          // Try to verify connection by checking if socket is still valid
          try {
            // If we have a socket and no connection update came, check manually
            if (this.sock.user) {
              console.log('✅ WhatsApp connection verified (already connected)!');
              this.isReady = true;
              this.connectionState = 'connected';
              this.isConnecting = false;
            }
          } catch (e) {
            // Socket might not be ready yet, that's okay
          }
        }
      }, 2000);

      // Handle messages (for receiving, if needed in future)
      this.sock.ev.on('messages.upsert', (m) => {
        // Handle incoming messages if needed
      });

      // Wait for connection to be established
      // Check both isReady flag and socket.user (which indicates connection)
      let attempts = 0;
      const maxWait = 120000; // 2 minutes max wait
      const startTime = Date.now();

      while (!this.isReady && (Date.now() - startTime) < maxWait) {
        await this.sleep(1000);
        attempts++;
        
        // Check if socket has user (indicates connection is established)
        try {
          if (this.sock && this.sock.user) {
            console.log('✅ WhatsApp connection detected via socket.user!');
            this.isReady = true;
            this.connectionState = 'connected';
            this.isConnecting = false;
            break;
          }
        } catch (e) {
          // Socket might not be ready yet
        }
        
        if (attempts % 10 === 0 && !this.isReady) {
          console.log(`⏳ Waiting for connection... (${attempts}s elapsed)`);
        }
      }

      if (this.isReady) {
        console.log('✅ WhatsApp is ready to send messages!');
      } else {
        console.log('⚠️ Connection not fully established. You can still try sending messages.');
        console.log('💡 If WhatsApp shows as connected on your phone, the connection should work.');
      }

      return this.sock;
    } catch (error) {
      console.error('❌ Error connecting to WhatsApp:', error);
      this.isConnecting = false;
      this.isReady = false;
      this.connectionState = 'error';
      throw error;
    }
  }

  /**
   * Send a single text message
   * 
   * @param {string} number - Phone number (will be formatted automatically)
   * @param {string} message - Message text
   * @param {string} imagePath - Optional image path (for future media support)
   * @returns {Promise<Object>} - Result object with success status
   */
  async sendMessage(number, message, imagePath = null) {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp not connected. Please connect first.');
    }

    try {
      const jid = this.formatPhoneNumber(number);
      
      console.log(`💬 Sending message to ${number} (${jid})`);

      // Validate JID format
      if (!jid.includes('@s.whatsapp.net')) {
        throw new Error(`Invalid phone number format: ${number}`);
      }

      // Send text message
      let result;
      if (imagePath && fs.existsSync(imagePath)) {
        // Send image with caption (future enhancement)
        const imageBuffer = fs.readFileSync(imagePath);
        result = await this.sock.sendMessage(jid, {
          image: imageBuffer,
          caption: message
        });
      } else {
        // Send text only
        result = await this.sock.sendMessage(jid, { text: message });
      }

      return {
        success: true,
        messageId: result.key.id,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`❌ Error sending message to ${number}:`, error.message);
      
      // Check if it's a known error
      let errorMessage = error.message;
      if (error.message.includes('not-a-whatsapp-number') || 
          error.message.includes('not registered')) {
        errorMessage = `Number ${number} is not registered on WhatsApp`;
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait before sending more messages.';
      }

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Read Excel or CSV file and extract contact data
   * Expected columns: number, name, message (or custom message template)
   * 
   * @param {string} filePath - Path to Excel or CSV file
   * @param {string} customMessage - Optional custom message template
   * @returns {Promise<Array>} - Array of contact objects with personalized messages
   */
  async readExcelFile(filePath, customMessage = '') {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const ext = path.extname(filePath).toLowerCase();
      console.log(`📖 Reading file: ${filePath} (${ext})`);

      let rows = [];
      
      if (ext === '.csv') {
        // Read CSV file
        const readStream = fs.createReadStream(filePath);
        
        await new Promise((resolve, reject) => {
          readStream
            .pipe(csvParser())
            .on('data', (row) => rows.push(row))
            .on('end', resolve)
            .on('error', reject);
        });
      } else {
        // Read Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        rows = XLSX.utils.sheet_to_json(sheet, { raw: false });
      }

      if (rows.length === 0) {
        throw new Error('Excel file is empty or has no data rows');
      }

      console.log(`✅ Found ${rows.length} rows in Excel file`);

      // Process rows and create personalized messages
      const contacts = [];
      const columnNames = Object.keys(rows[0] || {}).map(k => k.toLowerCase().trim());

      // Find phone number column (flexible matching)
      const phoneColumn = columnNames.find(col => 
        ['number', 'phone', 'mobile', 'contact', 'phonenumber', 'phone_number'].includes(col)
      );

      if (!phoneColumn) {
        throw new Error('No phone number column found. Expected: number, phone, mobile, or contact');
      }

      // Find name column (optional)
      const nameColumn = columnNames.find(col => 
        ['name', 'fullname', 'full_name', 'customer_name', 'client_name'].includes(col)
      );

      // Find message column (optional - for per-row custom messages)
      const messageColumn = columnNames.find(col => 
        ['message', 'msg', 'text', 'content'].includes(col)
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const originalPhoneColumn = Object.keys(row).find(k => k.toLowerCase().trim() === phoneColumn);
        const phoneNumber = String(row[originalPhoneColumn] || '').trim();

        // Skip if no phone number
        if (!phoneNumber) {
          console.warn(`⚠️ Row ${i + 1}: Skipping - no phone number`);
          continue;
        }

        // Get name if available
        let name = '';
        if (nameColumn) {
          const originalNameColumn = Object.keys(row).find(k => k.toLowerCase().trim() === nameColumn);
          name = String(row[originalNameColumn] || '').trim();
        }

        // Determine message to send
        let message = customMessage || '';
        if (messageColumn && !customMessage) {
          // Use per-row message if available and no custom message provided
          const originalMsgColumn = Object.keys(row).find(k => k.toLowerCase().trim() === messageColumn);
          message = String(row[originalMsgColumn] || '').trim();
        }

        // If still no message, use default
        if (!message) {
          message = `Hello${name ? ' ' + name : ''}, this is a message from WhatsApp Bot.`;
        }

        // Replace variables in message (e.g., {{name}}, {{number}})
        message = message.replace(/\{\{name\}\}/gi, name || 'there');
        message = message.replace(/\{\{number\}\}/gi, phoneNumber);
        
        // Replace any other column values
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().trim();
          if (normalizedKey !== phoneColumn && normalizedKey !== nameColumn && normalizedKey !== messageColumn) {
            const regex = new RegExp(`\\{\\{${normalizedKey}\\}\\}`, 'gi');
            message = message.replace(regex, String(row[key] || '').trim());
          }
        });

        contacts.push({
          number: phoneNumber,
          name: name,
          message: message,
          originalData: row // Keep original data for reference
        });
      }

      console.log(`✅ Processed ${contacts.length} valid contacts from Excel`);
      return contacts;
    } catch (error) {
      console.error('❌ Error reading Excel file:', error);
      throw error;
    }
  }

  /**
   * Send bulk messages from Excel file
   * Reads Excel, personalizes messages, and sends with rate limiting
   * 
   * @param {string} filePath - Path to Excel file
   * @param {string} customMessage - Optional custom message template
   * @param {string} imagePath - Optional image path
   * @param {number} delayMs - Delay between messages in milliseconds (default: 3000-5000)
   * @returns {Promise<Array>} - Array of results for each message
   */
  async sendBulkMessagesFromExcel(filePath, customMessage = '', imagePath = null, delayMs = null) {
    if (!this.sock || !this.isReady) {
      throw new Error('WhatsApp not connected. Please connect first.');
    }

    try {
      // Read Excel file
      const contacts = await this.readExcelFile(filePath, customMessage);
      
      if (contacts.length === 0) {
        throw new Error('No valid contacts found in Excel file');
      }

      console.log(`📤 Starting bulk message send to ${contacts.length} contacts`);
      if (imagePath) {
        console.log(`📷 Image attachment: ${imagePath}`);
      }

      const results = [];
      const minDelay = delayMs || 3000; // Default 3 seconds
      const maxDelay = delayMs || 5000; // Default 5 seconds

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const { number, message } = contact;

        console.log(`\n📱 [${i + 1}/${contacts.length}] Sending to ${number}${contact.name ? ` (${contact.name})` : ''}`);

        try {
          // Send message
          const result = await this.sendMessage(number, message, imagePath);
          
          // Categorize result
          let status = 'sent';
          if (!result.success) {
            if (result.error && (
              result.error.includes('not registered') || 
              result.error.includes('not-a-whatsapp-number')
            )) {
              status = 'invalid';
            } else {
              status = 'failed';
            }
          }

          results.push({
            number,
            name: contact.name || '',
            message,
            status,
            error: result.error || null,
            messageId: result.messageId || null,
            timestamp: result.timestamp,
          });

          // Log result
          if (status === 'sent') {
            console.log(`✅ Message sent successfully`);
          } else if (status === 'invalid') {
            console.log(`⚠️ Invalid number - skipped`);
          } else {
            console.log(`❌ Failed: ${result.error}`);
          }

        } catch (error) {
          console.error(`❌ Error processing ${number}:`, error.message);
          results.push({
            number,
            name: contact.name || '',
            message,
            status: 'failed',
            error: error.message,
            messageId: null,
            timestamp: new Date().toISOString(),
          });
        }

        // Rate limiting - delay between messages (except for last message)
        if (i < contacts.length - 1) {
          const delay = delayMs || (minDelay + Math.random() * (maxDelay - minDelay));
          const delaySeconds = (delay / 1000).toFixed(1);
          console.log(`⏳ Waiting ${delaySeconds}s before next message...`);
          await this.sleep(delay);
        }
      }

      // Summary
      const sentCount = results.filter(r => r.status === 'sent').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      const invalidCount = results.filter(r => r.status === 'invalid').length;

      console.log(`\n✅ Bulk messaging completed!`);
      console.log(`📊 Summary:`);
      console.log(`   ✅ Sent: ${sentCount}`);
      console.log(`   ❌ Failed: ${failedCount}`);
      console.log(`   ⚠️ Invalid: ${invalidCount}`);
      console.log(`   total: ${results.length}`);

      return results;
    } catch (error) {
      console.error('❌ Error in bulk messaging:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   * 
   * @returns {Promise<Object>} - Connection status object
   */
  async getConnectionStatus() {
    if (!this.sock) {
      return {
        connected: false,
        ready: false,
        state: 'disconnected'
      };
    }

    try {
      // Check if socket has user (indicates connection is established)
      let isConnected = false;
      try {
        if (this.sock.user) {
          isConnected = true;
          // Update internal state if we detect connection
          if (!this.isReady) {
            this.isReady = true;
            this.connectionState = 'connected';
          }
        }
      } catch (e) {
        // Socket might not be ready
      }
      
      // Also check internal state
      isConnected = isConnected || (this.isReady && this.connectionState === 'connected');
      
      return {
        connected: isConnected,
        ready: isConnected,
        state: this.connectionState,
        wapiReady: isConnected,
        qr: this.qr // Expose QR code
      };
    } catch (error) {
      return {
        connected: false,
        ready: false,
        state: 'error',
        error: error.message
      };
    }
  }

  /**
   * Close connection and cleanup
   */
  async close() {
    try {
      if (this.sock) {
        await this.sock.end(undefined);
        console.log('✅ WhatsApp connection closed');
      }
    } catch (error) {
      console.error('❌ Error closing connection:', error);
    } finally {
      this.sock = null;
      this.isReady = false;
      this.connectionState = 'disconnected';
    }
  }

  /**
   * Utility: Sleep/delay function
   * 
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = BaileysBot;

