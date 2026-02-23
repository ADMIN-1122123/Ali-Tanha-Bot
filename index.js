const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const config = require('./config.js');
const express = require('express');

// Web server for Railway
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ 
        status: 'active',
        bot: config.botName,
        time: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// Main bot function
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ['Tanha Bot', 'Safari', '2.0']
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    // PAIRING CODE GENERATION
    if (!sock.authState.creds.registered) {
        console.log('\n📱 ================================');
        console.log('🔐 PAIRING CODE LOGIN');
        console.log('📱 ================================\n');
        
        const phoneNumber = config.owner;
        console.log(`📞 Phone Number: ${phoneNumber}`);
        
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log('\n🔐 ===== YOUR PAIRING CODE =====');
                console.log(`\n   👉 ${code} 👈\n`);
                console.log('📱 How to use:');
                console.log('1. WhatsApp open karo');
                console.log('2. 3 dots menu → Linked Devices');
                console.log('3. "Link a Device"');
                console.log('4. Ye 8 digit code enter karo\n');
                console.log('🔐 =============================\n');
            } catch (err) {
                console.error('❌ Pairing code error:', err);
            }
        }, 3000);
    }
    
    // Connection handler
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('\n✅ BOT CONNECTED SUCCESSFULLY!');
            console.log(`👑 Owner: ${config.owner}`);
            console.log(`🤖 Bot Name: ${config.botName}\n`);
        }
    });
    
    // Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        if (m.key.fromMe) return;
        
        const sender = m.key.remoteJid;
        const text = m.message.conversation || '';
        
        if (!text.startsWith(config.prefix)) return;
        
        const args = text.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        // Basic commands
        if (command === 'ping') {
            await sock.sendMessage(sender, { text: '🏓 Pong!' });
        }
        else if (command === 'info') {
            await sock.sendMessage(sender, { 
                text: `🤖 *${config.botName}*\n👑 Owner: ${config.owner}\n📦 Version: ${config.version}` 
            });
        }
        else if (command === 'menu') {
            await sock.sendMessage(sender, { 
                text: `📋 *COMMANDS*\n.ping - Check bot\n.info - Bot info\n.menu - This menu` 
            });
        }
    });
    
    return sock;
}

startBot().catch(err => {
    console.error('❌ Fatal error:', err);
});