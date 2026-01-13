const venom = require('venom-bot');

class VenomBot {
  constructor() {
    console.log('🔄 VenomBot Class Loaded - Fix Applied');
    this.client = null;
    this.isReady = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing VenomBot...');
      this.client = await venom.create({
        session: 'whatsapp-bot',
        multidevice: true,
        headless: false, // Set to false to open browser window for QR scanning
        useChrome: true,
        logQR: true,
        autoClose: 60000,
      });

      console.log('✅ VenomBot client created!');

      this.client.onStateChange((state) => {
        console.log('📱 WhatsApp state changed:', state);
        this.isReady = state === 'CONNECTED';
        
        // When connected, wait a bit for WAPI to be fully ready
        if (state === 'CONNECTED') {
          console.log('⏳ Waiting for WhatsApp Web API to be fully ready...');
          setTimeout(async () => {
            const wapiReady = await this.waitForWAPIReady(10000);
            if (wapiReady) {
              console.log('✅ WhatsApp Web API is ready!');
            } else {
              console.warn('⚠️ WAPI readiness check timed out, but connection is active');
            }
          }, 2000);
        }
      });

      // Check initial state
      const initialState = await this.client.getConnectionState();
      this.isReady = initialState === 'CONNECTED';
      
      if (this.isReady) {
        console.log('✅ VenomBot initialized and connected!');
        // Wait for WAPI to be ready
        await this.waitForWAPIReady(10000);
      } else {
        console.log('⏳ Waiting for QR code scan...');
      }

      return this.client;
    } catch (error) {
      console.error('❌ VenomBot init error:', error);
      this.isReady = false;
      throw error;
    }
  }

  formatPhoneNumber(number) {
    let clean = number.replace(/[^\d]/g, '');
    // If length is 10, assume Indian number and prepend 91
    if (clean.length === 10) {
      clean = '91' + clean;
    } 
    // Otherwise just use the number as is (assuming it has country code)
    
    return clean + '@c.us';
  }


  // Wait for WAPI to be fully ready
  async waitForWAPIReady(maxWait = 10000) {
    if (!this.client) return false;
    
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      try {
        const state = await this.client.getConnectionState();
        if (state === 'CONNECTED') {
          // Try a simple operation to verify WAPI is ready
          try {
            await this.client.getHostDevice();
            return true;
          } catch (e) {
            // WAPI not fully ready yet
            await this.sleep(500);
            continue;
          }
        }
        await this.sleep(500);
      } catch (error) {
        await this.sleep(500);
      }
    }
    return false;
  }

  async sendMessage(number, message, imagePath = null) {
    if (!this.client || !this.isReady) {
      throw new Error('VenomBot not ready.');
    }

    // Wait for WAPI to be fully ready before sending
    console.log('⏳ Verifying WhatsApp Web API is ready...');
    const wapiReady = await this.waitForWAPIReady(5000);
    if (!wapiReady) {
      console.warn('⚠️ WAPI readiness check timed out, proceeding anyway...');
    }

    const maxRetries = 5; // Increased retries for WAPI errors
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const whatsappNumber = this.formatPhoneNumber(number);
        
        // Only check number status on first attempt to avoid unnecessary calls
        if (attempt === 1) {
          try {
            console.log('📞 Checking WhatsApp registration for:', whatsappNumber);
            const status = await this.client.checkNumberStatus(whatsappNumber);
            console.log('✅ Check result:', status);
        
            const exists = status.exists === true || status.numberExists === true;
            if (!exists) {
              console.error('❌ Number not registered on WhatsApp:', number);
              throw new Error(`Number ${number} not on WhatsApp`);
            }
          } catch (checkError) {
            // If checkNumberStatus fails, it might be a WAPI issue, continue to retry
            if (!checkError.message.includes('not on WhatsApp')) {
              console.warn('⚠️ Number check failed, will retry:', checkError.message);
              await this.sleep(1000 * attempt);
              continue;
            }
            throw checkError;
          }
        }

        let result;
        
        // Send image with caption if image path is provided
        if (imagePath) {
          console.log(`📷 Sending image (Attempt ${attempt}/${maxRetries}):`, number);
          result = await this.client.sendImage(whatsappNumber, imagePath, 'image', message);
        } else {
          // Send text only
          console.log(`💬 Sending text (Attempt ${attempt}/${maxRetries}):`, number);
          result = await this.client.sendText(whatsappNumber, message);
        }

        return {
          success: true,
          messageId: result.id,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || String(error);
        console.warn(`⚠️ sendMessage attempt ${attempt}/${maxRetries} failed:`, errorMsg);
        
        // Check for WAPI/initialization errors
        const isWAPIError = errorMsg.includes('getMaybeMeUser') || 
                           errorMsg.includes('WAPI') || 
                           errorMsg.includes('Evaluation failed') ||
                           errorMsg.includes('Cannot read properties of undefined') ||
                           (error.name === 'TypeError' && errorMsg.includes('undefined'));
        
        if (isWAPIError) {
          console.log(`⏳ WAPI error detected (attempt ${attempt}), waiting ${2000 * attempt}ms before retry...`);
          // Progressive backoff: 2s, 4s, 6s, 8s, 10s
          await this.sleep(2000 * attempt);
          
          // Try to verify connection is still good
          try {
            const state = await this.client.getConnectionState();
            if (state !== 'CONNECTED') {
              console.error('❌ Connection lost during retry');
              break;
            }
          } catch (stateError) {
            console.error('❌ Cannot verify connection state');
            break;
          }
          continue;
        }
        
        // If number invalid, don't retry
        if (errorMsg.includes('not on WhatsApp') || errorMsg.includes('not registered')) {
          break;
        }
        
        // For other errors, wait and retry with shorter delay
        if (attempt < maxRetries) {
          await this.sleep(1000 * attempt);
        }
      }
    }

    // If we get here, all retries failed
    console.error(`❌ sendMessage failed after ${maxRetries} attempts.`);
    return {
      success: false,
      error: lastError ? (lastError.message || String(lastError)) : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }



  async sendBulkMessages(csvData, imagePath = null) {
    if (!this.client || !this.isReady) throw new Error('VenomBot not ready.');
    const results = [];
    
    console.log(`📤 Starting bulk message send to ${csvData.length} contacts${imagePath ? ' with image attachment' : ''}`);
    
    for (let i = 0; i < csvData.length; i++) {
      const { number, message } = csvData[i];
      console.log(`📱 Sending message ${i + 1}/${csvData.length} to ${number}`);
      
      const result = await this.sendMessage(number, message, imagePath);
      results.push({
        number,
        message,
        status: result.success ? 'sent' : 'failed',
        error: result.error || null,
        messageId: result.messageId || null,
        timestamp: result.timestamp,
      });
      
      // Delay to avoid rate limits
      if (i < csvData.length - 1) {
        const delay = 2500 + Math.random() * 2000;
        console.log(`⏳ Waiting ${Math.round(delay)}ms before next message...`);
        await this.sleep(delay);
      }
    }
    
    console.log(`✅ Bulk message send completed. Sent: ${results.filter(r => r.status === 'sent').length}, Failed: ${results.filter(r => r.status === 'failed').length}`);
    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getConnectionStatus() {
    if (!this.client) return { connected: false, ready: false, wapiReady: false };
    try {
      const state = await this.client.getConnectionState();
      const isConnected = state === 'CONNECTED';
      
      // Try to verify WAPI is actually ready
      let wapiReady = false;
      if (isConnected) {
        try {
          await this.client.getHostDevice();
          wapiReady = true;
        } catch (e) {
          // WAPI might not be fully ready yet
          wapiReady = false;
        }
      }
      
      return { 
        connected: isConnected, 
        ready: this.isReady && isConnected && wapiReady, 
        wapiReady: wapiReady,
        state 
      };
    } catch (error) {
      return { connected: false, ready: false, wapiReady: false, error: error.message };
    }
  }

  async close() {
    if (this.client) {
      try { await this.client.close(); } catch (e) {}
    }
    this.client = null;
    this.isReady = false;
  }
}

module.exports = VenomBot;