import pkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = pkg;
import pino from 'pino';
import express from 'express';
import fs from 'fs';

// ============================================
// CONFIGURATION – TERA NUMBER SET HAI
// ============================================
const CONFIG = {
    owner: "923037082340",      // ✅ tera number set kar diya
    botName: "Tanha Bot",
    version: "5.0",
    prefix: ".",
    admins: [],
    banned: [],
    userPermissions: {},
    groupSettings: {}
};

// ============================================
// DATABASE
// ============================================
const DB_PATH = '/tmp/database.json';

function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH);
            const db = JSON.parse(data);
            CONFIG.admins = db.admins || [];
            CONFIG.banned = db.banned || [];
            CONFIG.userPermissions = db.userPermissions || {};
            CONFIG.groupSettings = db.groupSettings || {};
            console.log('✅ Database loaded');
        }
    } catch (e) {}
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify({
            admins: CONFIG.admins,
            banned: CONFIG.banned,
            userPermissions: CONFIG.userPermissions,
            groupSettings: CONFIG.groupSettings
        }, null, 2));
    } catch (e) {}
}

loadDatabase();

// ============================================
// EXPRESS SERVER
// ============================================
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.json({ status: 'active', bot: CONFIG.botName });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getUserLevel(jid) {
    const user = jid.split('@')[0];
    if (CONFIG.banned.includes(user)) return 'banned';
    if (CONFIG.owner === user) return 'owner';
    if (CONFIG.admins.includes(user)) return 'admin';
    return 'user';
}

function canUseCommand(jid, cmd) {
    const user = jid.split('@')[0];
    const level = getUserLevel(jid);
    
    if (level === 'owner') return true;
    if (level === 'banned') return false;
    
    const cmds = {
        owner: ['allow','deny','addadmin','removeadmin','banuser','unbanuser'],
        admin: ['kick','add','promote','demote','tagall','hidetag','mute','unmute','ban','tempban','unban','banlist'],
        user: ['ping','info','menu','myperms','owner','admins','cmd']
    };
    
    if (level === 'admin' && (cmds.admin.includes(cmd) || cmds.user.includes(cmd))) return true;
    if (level === 'user' && cmds.user.includes(cmd)) return true;
    if (level === 'user' && CONFIG.userPermissions[user]?.includes(cmd)) return true;
    
    return false;
}

function toTiny(text) {
    const map = {
        'a':'ᵃ','b':'ᵇ','c':'ᶜ','d':'ᵈ','e':'ᵉ','f':'ᶠ','g':'ᵍ','h':'ʰ','i':'ⁱ','j':'ʲ',
        'k':'ᵏ','l':'ˡ','m':'ᵐ','n':'ⁿ','o':'ᵒ','p':'ᵖ','q':'ᵠ','r':'ʳ','s':'ˢ','t':'ᵗ',
        'u':'ᵘ','v':'ᵛ','w':'ʷ','x':'ˣ','y':'ʸ','z':'ᶻ','A':'ᴬ','B':'ᴮ','C':'ᶜ','D':'ᴰ',
        'E':'ᴱ','F':'ᶠ','G':'ᴳ','H':'ᴴ','I':'ᴵ','J':'ᴶ','K':'ᴷ','L':'ᴸ','M':'ᴹ','N':'ᴺ',
        'O':'ᴼ','P':'ᴾ','Q':'ᵠ','R':'ᴿ','S':'ˢ','T':'ᵀ','U':'ᵁ','V':'ⱽ','W':'ᵂ','X':'ˣ',
        'Y':'ʸ','Z':'ᶻ','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'
    };
    return text.split('').map(c => map[c] || c).join('');
}

function addTiny(text) {
    return text + '\n\n\n' + ' '.repeat(45) + toTiny(CONFIG.botName);
}

function parseTime(str) {
    const match = str.match(/^(\d+)([mhd])$/);
    if (!match) return null;
    const [, num, unit] = match;
    const mult = { m: 60000, h: 3600000, d: 86400000 };
    return parseInt(num) * mult[unit];
}

async function getName(jid, sock) {
    try {
        return await sock.getName(jid) || jid.split('@')[0];
    } catch {
        return jid.split('@')[0];
    }
}

// ============================================
// MAIN BOT FUNCTION
// ============================================
async function startBot() {
    try {
        console.log('\n🤖 Starting Tanha Bot...\n');
        
        const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info');
        
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Tanha Bot', 'Chrome', '5.0.0'],
            syncFullHistory: false,
            markOnlineOnConnect: false
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        // ============================================
        // PAIRING CODE – TERA NUMBER: 923037082340
        // ============================================
        if (!sock.authState.creds.registered) {
            console.log('📱 ================================');
            console.log('🔐 PAIRING CODE GENERATOR');
            console.log('📱 ================================\n');
            
            const phoneNumber = "923037082340";  // ✅ tera number yahan bhi set hai
            console.log(`📞 Number: ${phoneNumber}`);
            console.log('⏳ Generating code in 3 seconds...\n');
            
            setTimeout(async () => {
                try {
                    console.log('🔄 Requesting...');
                    const code = await sock.requestPairingCode(phoneNumber);
                    
                    // Format as ABCD-EFGH
                    const formatted = code.match(/.{1,4}/g).join('-');
                    
                    console.log('\n✅ ================================');
                    console.log('✅ PAIRING CODE READY!');
                    console.log('✅ ================================\n');
                    console.log(`👉 ${formatted} 👈\n`);
                    console.log('📱 Enter this code in WhatsApp:');
                    console.log('1. 3 dots menu → Linked Devices');
                    console.log('2. "Link a Device"');
                    console.log('3. "Link with phone number"');
                    console.log('4. Enter code: ' + formatted + '\n');
                } catch (err) {
                    console.log('\n❌ Error: ' + err.message);
                    console.log('🔄 Retrying in 10 seconds...\n');
                }
            }, 3000);
        }
        
        // ============================================
        // CONNECTION HANDLER
        // ============================================
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('Reconnecting...');
                    setTimeout(startBot, 5000);
                }
            } else if (connection === 'open') {
                console.log('\n✅ BOT CONNECTED!');
                console.log(`👑 Owner: ${CONFIG.owner}`);
                console.log(`🤖 Bot: ${CONFIG.botName}\n`);
            }
        });
        
        // ============================================
        // GROUP HANDLER
        // ============================================
        sock.ev.on('group-participants.update', async (update) => {
            const { id, participants, action } = update;
            
            for (let p of participants) {
                const name = await getName(p, sock);
                
                if (action === 'add') {
                    if (CONFIG.banned.includes(p.split('@')[0])) {
                        await sock.groupParticipantsUpdate(id, [p], 'remove');
                        continue;
                    }
                    
                    const msg = `╔══════════════════╗
║  ✨ WELCOME ✨  ║
╠══════════════════╣
║  ${name}
║
║  🎉 Glad to have you!
╚══════════════════╝`;
                    
                    await sock.sendMessage(id, { text: addTiny(msg), mentions: [p] });
                }
                
                if (action === 'remove') {
                    const msg = `╔══════════════════╗
║  👋 GOODBYE  ║
╠══════════════════╣
║  ${name}
║
║  😢 See you again!
╚══════════════════╝`;
                    
                    await sock.sendMessage(id, { text: addTiny(msg) });
                }
            }
        });
        
        // ============================================
        // MESSAGE HANDLER – ALL COMMANDS
        // ============================================
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;
            
            const sender = m.key.remoteJid;
            const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
            
            if (!text.startsWith(CONFIG.prefix)) return;
            
            const args = text.slice(1).trim().split(/ +/);
            const cmd = args.shift().toLowerCase();
            
            if (!canUseCommand(m.sender, cmd)) {
                await sock.sendMessage(sender, { text: '❌ No permission!' });
                return;
            }
            
            console.log(`📨 ${getUserLevel(m.sender)}: ${cmd}`);
            
            try {
                // BASIC COMMANDS
                if (cmd === 'ping') {
                    const start = Date.now();
                    await sock.sendMessage(sender, { text: '🏓 Pong!' });
                    const end = Date.now();
                    await sock.sendMessage(sender, { text: addTiny(`⚡ ${end-start}ms`) });
                }
                
                else if (cmd === 'info') {
                    const info = `╔══════════════════╗
║  BOT INFO       ║
╠══════════════════╣
║  🤖 ${CONFIG.botName}
║  👑 ${CONFIG.owner}
║  📦 v${CONFIG.version}
║  👥 Admins: ${CONFIG.admins.length}
║  🚫 Banned: ${CONFIG.banned.length}
╚══════════════════╝`;
                    await sock.sendMessage(sender, { text: addTiny(info) });
                }
                
                else if (cmd === 'menu') {
                    const level = getUserLevel(m.sender);
                    let menu = `╔══════════════════╗
║  ${CONFIG.botName}  ║
╠══════════════════╣\n`;
                    
                    if (level === 'owner') {
                        menu += `\n👑 OWNER\n.allow\n.deny\n.addadmin\n.removeadmin\n.banuser\n.unbanuser\n`;
                    }
                    if (level === 'owner' || level === 'admin') {
                        menu += `\n👥 ADMIN\n.kick\n.add\n.promote\n.demote\n.tagall\n.hidetag\n.mute\n.unmute\n.ban\n.tempban\n.unban\n.banlist\n`;
                    }
                    menu += `\n👤 USER\n.ping\n.info\n.menu\n.myperms\n.owner\n.admins\n.cmd\n`;
                    menu += `\n╚══════════════════╝`;
                    
                    await sock.sendMessage(sender, { text: addTiny(menu) });
                }
                
                else if (cmd === 'myperms') {
                    const level = getUserLevel(m.sender);
                    const user = m.sender.split('@')[0];
                    let perms = `╔══════════════════╗
║  YOUR PERMS     ║
╠══════════════════╣
║  Level: ${level.toUpperCase()}\n`;
                    
                    if (level === 'owner') perms += `║  🔑 Full Access\n`;
                    else if (level === 'admin') perms += `║  🔰 Admin Commands\n`;
                    else if (CONFIG.userPermissions[user]?.length) {
                        perms += `║  ✨ ${CONFIG.userPermissions[user].join(', ')}\n`;
                    }
                    perms += `╚══════════════════╝`;
                    
                    await sock.sendMessage(sender, { text: addTiny(perms) });
                }
                
                else if (cmd === 'owner') {
                    await sock.sendMessage(sender, { text: addTiny(`👑 Owner: ${CONFIG.owner}`) });
                }
                
                else if (cmd === 'admins' && sender.endsWith('@g.us')) {
                    const meta = await sock.groupMetadata(sender);
                    const admins = meta.participants.filter(p => p.admin);
                    let list = `👥 Admins (${admins.length})\n\n`;
                    for (let a of admins) {
                        list += `• ${await getName(a.id, sock)}\n`;
                    }
                    await sock.sendMessage(sender, { text: list });
                }
                
                else if (cmd === 'cmd' && args[0] === 'info') {
                    const info = `╔══════════════════╗
║  COMMANDS INFO  ║
╠══════════════════╣
║
║  👑 OWNER
║  .allow .deny .addadmin
║  .removeadmin .banuser .unbanuser
║
║  👥 ADMIN
║  .kick .add .promote .demote
║  .tagall .hidetag .mute .unmute
║  .ban .tempban .unban .banlist
║
║  👤 USER
║  .ping .info .menu .myperms
║  .owner .admins .cmd
║
║  📝 @user @time @count
║  ⏱️ 30m 2h 1d
╚══════════════════╝`;
                    await sock.sendMessage(sender, { text: addTiny(info) });
                }
                
                // OWNER COMMANDS
                else if (cmd === 'allow' && getUserLevel(m.sender) === 'owner') {
                    const cmdName = args[0];
                    const target = args[1]?.replace('@','')?.split('@')[0];
                    if (!cmdName || !target) return;
                    
                    if (!CONFIG.userPermissions[target]) CONFIG.userPermissions[target] = [];
                    if (!CONFIG.userPermissions[target].includes(cmdName)) {
                        CONFIG.userPermissions[target].push(cmdName);
                        saveDatabase();
                        await sock.sendMessage(sender, { text: `✅ @${target} can use .${cmdName}` });
                    }
                }
                
                else if (cmd === 'deny' && getUserLevel(m.sender) === 'owner') {
                    const cmdName = args[0];
                    const target = args[1]?.replace('@','')?.split('@')[0];
                    if (CONFIG.userPermissions[target]) {
                        CONFIG.userPermissions[target] = CONFIG.userPermissions[target].filter(c => c !== cmdName);
                        saveDatabase();
                        await sock.sendMessage(sender, { text: `✅ Removed .${cmdName} from @${target}` });
                    }
                }
                
                else if (cmd === 'addadmin' && getUserLevel(m.sender) === 'owner') {
                    const target = args[0]?.replace('@','')?.split('@')[0];
                    if (target && !CONFIG.admins.includes(target)) {
                        CONFIG.admins.push(target);
                        saveDatabase();
                        await sock.sendMessage(sender, { text: `✅ @${target} added as admin` });
                    }
                }
                
                else if (cmd === 'removeadmin' && getUserLevel(m.sender) === 'owner') {
                    const target = args[0]?.replace('@','')?.split('@')[0];
                    CONFIG.admins = CONFIG.admins.filter(a => a !== target);
                    saveDatabase();
                    await sock.sendMessage(sender, { text: `✅ @${target} removed from admin` });
                }
                
                else if (cmd === 'banuser' && getUserLevel(m.sender) === 'owner') {
                    const target = args[0]?.replace('@','')?.split('@')[0];
                    if (target && !CONFIG.banned.includes(target)) {
                        CONFIG.banned.push(target);
                        saveDatabase();
                        await sock.sendMessage(sender, { text: `🚫 @${target} banned from bot` });
                    }
                }
                
                else if (cmd === 'unbanuser' && getUserLevel(m.sender) === 'owner') {
                    const target = args[0]?.replace('@','')?.split('@')[0];
                    CONFIG.banned = CONFIG.banned.filter(b => b !== target);
                    saveDatabase();
                    await sock.sendMessage(sender, { text: `✅ @${target} unbanned` });
                }
                
                // ADMIN COMMANDS
                else if (['kick','add','promote','demote'].includes(cmd) && ['owner','admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const target = cmd === 'add' ? args[0] + '@s.whatsapp.net' : m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return;
                    
                    const action = {
                        kick: 'remove',
                        add: 'add',
                        promote: 'promote',
                        demote: 'demote'
                    }[cmd];
                    
                    await sock.groupParticipantsUpdate(sender, [target], action);
                    await sock.sendMessage(sender, { text: `✅ ${cmd} done` });
                }
                
                else if (cmd === 'tagall' && ['owner','admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const meta = await sock.groupMetadata(sender);
                    const mentions = meta.participants.map(p => p.id);
                    const msg = args.join(' ') || '📢 @all';
                    
                    await sock.sendMessage(sender, { text: msg, mentions });
                }
                
                else if (cmd === 'ban' && ['owner','admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return;
                    
                    await sock.groupParticipantsUpdate(sender, [target], 'remove');
                    await sock.sendMessage(sender, { text: `⛔ Banned @${target.split('@')[0]}` });
                }
                
                else if (cmd === 'tempban' && ['owner','admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return;
                    
                    const timeStr = args[0] || '1h';
                    const ms = parseTime(timeStr);
                    if (!ms) return;
                    
                    await sock.groupParticipantsUpdate(sender, [target], 'remove');
                    
                    setTimeout(async () => {
                        await sock.sendMessage(sender, { text: `✅ @${target.split('@')[0]} auto-unbanned` });
                    }, ms);
                    
                    await sock.sendMessage(sender, { text: `⏳ Temp banned for ${timeStr}` });
                }
                
                else if (cmd === 'mute' && ['owner','admin'].includes(getUserLevel(m.sender))) {
                    const timeStr = args[0] || '1h';
                    const ms = parseTime(timeStr);
                    
                    CONFIG.groupSettings[sender] = { muted: true };
                    saveDatabase();
                    
                    setTimeout(() => {
                        if (CONFIG.groupSettings[sender]) {
                            CONFIG.groupSettings[sender].muted = false;
                            saveDatabase();
                        }
                    }, ms);
                    
                    await sock.sendMessage(sender, { text: `🔇 Muted for ${timeStr}` });
                }
                
                else if (cmd === 'unmute' && ['owner','admin'].includes(getUserLevel(m.sender))) {
                    if (CONFIG.groupSettings[sender]) {
                        CONFIG.groupSettings[sender].muted = false;
                        saveDatabase();
                        await sock.sendMessage(sender, { text: '🔊 Unmuted!' });
                    }
                }
                
                else if (cmd === 'banlist' && ['owner','admin'].includes(getUserLevel(m.sender))) {
                    await sock.sendMessage(sender, { text: `📋 Banned users: ${CONFIG.banned.length}` });
                }
                
            } catch (err) {
                console.log('Error:', err.message);
                await sock.sendMessage(sender, { text: `❌ Error: ${err.message}` });
            }
        });
        
    } catch (err) {
        console.log('Fatal error:', err.message);
        setTimeout(startBot, 10000);
    }
}

// START BOT
startBot();
