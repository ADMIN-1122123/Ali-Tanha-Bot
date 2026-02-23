import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CONFIGURATION
// ============================================
const config = {
    owner: "923037082340", // 👈 APNA NUMBER YAHAN LIKHO!
    botName: "Tanha Bot",
    version: "3.0",
    prefix: ".",
    admins: [],
    banned: [],
    userPermissions: {},
    groupSettings: {}
};

// ============================================
// DATABASE FUNCTIONS
// ============================================
function loadDatabase() {
    try {
        const data = fs.readFileSync('/tmp/database.json');
        const db = JSON.parse(data);
        config.admins = db.admins || [];
        config.banned = db.banned || [];
        config.userPermissions = db.userPermissions || {};
        config.groupSettings = db.groupSettings || {};
        console.log('✅ Database loaded');
    } catch (e) {
        console.log('No database found, creating new...');
    }
}

function saveDatabase() {
    const db = {
        admins: config.admins,
        banned: config.banned,
        userPermissions: config.userPermissions,
        groupSettings: config.groupSettings
    };
    fs.writeFileSync('/tmp/database.json', JSON.stringify(db, null, 2));
}

// Load database on start
loadDatabase();

// ============================================
// PERMISSION FUNCTIONS
// ============================================
function getUserLevel(userJid) {
    const user = userJid.split('@')[0];
    if (config.banned.includes(user)) return 'banned';
    if (config.owner === user) return 'owner';
    if (config.admins.includes(user)) return 'admin';
    return 'user';
}

function canExecuteCommand(userJid, command) {
    const user = userJid.split('@')[0];
    const level = getUserLevel(userJid);
    
    if (level === 'owner') return { allowed: true, level: 'owner' };
    if (level === 'banned') return { allowed: false, level: 'banned' };
    
    const cmdCategories = {
        owner: ['allow', 'deny', 'addadmin', 'removeadmin', 'banuser', 'unbanuser', 'setname', 'setdp', 'broadcast', 'set'],
        admin: ['kick', 'add', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'antilink', 'ban', 'tempban', 'unban', 'banlist', 'setrules'],
        user: ['ping', 'info', 'menu', 'myperms', 'owner', 'rules', 'admins', 'sticker', 'cmd']
    };
    
    if (level === 'admin') {
        if (cmdCategories.admin.includes(command) || cmdCategories.user.includes(command)) {
            return { allowed: true, level: 'admin' };
        }
    }
    
    if (level === 'user') {
        if (config.userPermissions[user] && config.userPermissions[user].includes(command)) {
            return { allowed: true, level: 'user', specific: true };
        }
        if (cmdCategories.user.includes(command)) {
            return { allowed: true, level: 'user' };
        }
    }
    
    return { allowed: false, level };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function toTiny(text) {
    const tinyMap = {
        'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
        'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
        'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
        'p': 'ᵖ', 'q': 'ᵠ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ',
        'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ',
        'z': 'ᶻ',
        'A': 'ᴬ', 'B': 'ᴮ', 'C': 'ᶜ', 'D': 'ᴰ', 'E': 'ᴱ',
        'F': 'ᶠ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ',
        'K': 'ᴷ', 'L': 'ᴸ', 'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ',
        'P': 'ᴾ', 'Q': 'ᵠ', 'R': 'ᴿ', 'S': 'ˢ', 'T': 'ᵀ',
        'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ', 'X': 'ˣ', 'Y': 'ʸ',
        'Z': 'ᶻ',
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    return text.split('').map(char => tinyMap[char] || char).join('');
}

function addTinyLogo(text) {
    const tinyName = toTiny(config.botName);
    return text + '\n\n\n' + ' '.repeat(45) + tinyName;
}

function parseTime(timeStr) {
    const match = timeStr.match(/^(\d+)([mhd])$/);
    if (!match) return null;
    const [, num, unit] = match;
    const multipliers = { m: 60000, h: 3600000, d: 86400000 };
    return parseInt(num) * multipliers[unit];
}

async function getProfileName(jid, sock) {
    try {
        const name = await sock.getName(jid);
        return name || jid.split('@')[0];
    } catch {
        return jid.split('@')[0];
    }
}

// ============================================
// EXPRESS SERVER FOR RAILWAY
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        status: 'active',
        bot: config.botName,
        time: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ============================================
// MAIN BOT FUNCTION
// ============================================
async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info');
        
        const sock = makeWASocket({
            printQRInTerminal: false,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Tanha Bot', 'Safari', '3.0'],
            syncFullHistory: false,
            markOnlineOnConnect: false
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        // ============================================
        // PAIRING CODE
        // ============================================
        if (!sock.authState.creds.registered) {
            console.log('\n📱 ================================');
            console.log('🔐 GENERATING PAIRING CODE');
            console.log('📱 ================================\n');
            
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(config.owner);
                    console.log('\n🔐 ===== YOUR PAIRING CODE =====');
                    console.log(`\n   👉 ${code} 👈\n`);
                    console.log('📱 Enter this code in WhatsApp');
                    console.log('🔐 =============================\n');
                } catch (err) {
                    console.error('❌ Pairing code error:', err);
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
                console.log('Connection closed, reconnecting...');
                if (shouldReconnect) {
                    setTimeout(() => startBot(), 5000);
                }
            } else if (connection === 'open') {
                console.log('\n✅ BOT CONNECTED SUCCESSFULLY!');
                console.log(`👑 Owner: ${config.owner}`);
                console.log(`🤖 Bot Name: ${config.botName}\n`);
            }
        });
        
        // ============================================
        // GROUP PARTICIPANTS HANDLER
        // ============================================
        sock.ev.on('group-participants.update', async (update) => {
            const { id, participants, action } = update;
            
            for (let participant of participants) {
                const userName = await getProfileName(participant, sock);
                
                if (action === 'add') {
                    if (config.banned.includes(participant.split('@')[0])) {
                        await sock.groupParticipantsUpdate(id, [participant], 'remove');
                        continue;
                    }
                    
                    // Welcome message
                    const welcomeMsg = `╔══════════════════╗
║  ✨ WELCOME ✨  ║
╠══════════════════╣
║  ${userName}
║
║  🎉 Glad to have you!
╚══════════════════╝`;
                    
                    await sock.sendMessage(id, {
                        text: addTinyLogo(welcomeMsg),
                        mentions: [participant]
                    });
                }
                
                if (action === 'remove') {
                    const leaveMsg = `╔══════════════════╗
║  👋 GOODBYE  ║
╠══════════════════╣
║  ${userName}
║
║  😢 See you again!
╚══════════════════╝`;
                    
                    await sock.sendMessage(id, { text: addTinyLogo(leaveMsg) });
                }
            }
        });
        
        // ============================================
        // MESSAGE HANDLER - ALL COMMANDS
        // ============================================
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message) return;
            if (m.key.fromMe) return;
            
            const sender = m.key.remoteJid;
            const text = m.message.conversation || 
                        m.message.extendedTextMessage?.text || '';
            
            if (!text.startsWith(config.prefix)) return;
            
            const args = text.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            // Check permissions
            const permission = canExecuteCommand(m.sender, command);
            if (!permission.allowed) {
                await sock.sendMessage(sender, {
                    text: `❌ Permission Denied!\nYour Level: ${permission.level}`
                });
                return;
            }
            
            console.log(`✅ ${permission.level} used .${command}`);
            
            try {
                // ===== BASIC COMMANDS =====
                if (command === 'ping') {
                    const start = Date.now();
                    await sock.sendMessage(sender, { text: '🏓 Pong!' });
                    const end = Date.now();
                    await sock.sendMessage(sender, {
                        text: addTinyLogo(`⚡ Speed: ${end - start}ms`)
                    });
                }
                
                else if (command === 'info') {
                    const info = `╔══════════════════╗
║  *BOT INFO*     ║
╠══════════════════╣
║  🤖 Name: ${config.botName}
║  👑 Owner: ${config.owner}
║  📦 Version: ${config.version}
║  👥 Admins: ${config.admins.length}
║  🚫 Banned: ${config.banned.length}
╚══════════════════╝`;
                    
                    await sock.sendMessage(sender, { text: addTinyLogo(info) });
                }
                
                else if (command === 'menu') {
                    const level = getUserLevel(m.sender);
                    let menu = `╔══════════════════╗
║  ${config.botName}  ║
╠══════════════════╣\n`;
                    
                    if (level === 'owner') {
                        menu += `\n👑 *OWNER*\n`;
                        menu += `• .allow\n• .deny\n• .addadmin\n• .removeadmin\n`;
                        menu += `• .banuser\n• .unbanuser\n• .set\n`;
                    }
                    
                    if (level === 'owner' || level === 'admin') {
                        menu += `\n👥 *ADMIN*\n`;
                        menu += `• .kick\n• .add\n• .promote\n• .demote\n`;
                        menu += `• .tagall\n• .hidetag\n• .mute\n• .unmute\n`;
                        menu += `• .ban\n• .tempban\n• .unban\n• .banlist\n`;
                    }
                    
                    menu += `\n👤 *USER*\n`;
                    menu += `• .ping\n• .info\n• .menu\n• .myperms\n`;
                    menu += `• .owner\n• .admins\n• .cmd\n`;
                    
                    menu += `\n╚══════════════════╝`;
                    
                    await sock.sendMessage(sender, { text: addTinyLogo(menu) });
                }
                
                else if (command === 'myperms') {
                    const level = getUserLevel(m.sender);
                    const user = m.sender.split('@')[0];
                    
                    let perms = `╔══════════════════╗
║  *YOUR PERMS*   ║
╠══════════════════╣
║  Level: ${level.toUpperCase()}\n`;
                    
                    if (level === 'owner') {
                        perms += `║  🔑 Full Access\n`;
                    } else if (level === 'admin') {
                        perms += `║  🔰 Admin Commands\n`;
                    } else if (config.userPermissions[user]?.length > 0) {
                        perms += `║  ✨ Special: ${config.userPermissions[user].join(', ')}\n`;
                    }
                    
                    perms += `╚══════════════════╝`;
                    
                    await sock.sendMessage(sender, { text: addTinyLogo(perms) });
                }
                
                else if (command === 'owner') {
                    await sock.sendMessage(sender, {
                        text: addTinyLogo(`👑 Owner: ${config.owner}`)
                    });
                }
                
                else if (command === 'admins') {
                    if (!sender.endsWith('@g.us')) {
                        return sock.sendMessage(sender, { text: '❌ Groups only!' });
                    }
                    
                    const groupMeta = await sock.groupMetadata(sender);
                    const admins = groupMeta.participants.filter(p => p.admin);
                    
                    let list = `👥 *Admins (${admins.length})*\n\n`;
                    for (let admin of admins) {
                        const name = await getProfileName(admin.id, sock);
                        list += `• ${name}\n`;
                    }
                    
                    await sock.sendMessage(sender, { text: list });
                }
                
                else if (command === 'cmd') {
                    if (args[0] === 'info') {
                        const cmdInfo = `╔══════════════════════════╗
║     📚 COMMANDS INFO     ║
╠══════════════════════════╣
║
║  👑 OWNER (10)
║  .allow, .deny, .addadmin
║  .removeadmin, .banuser
║  .unbanuser, .set
║
║  👥 ADMIN (15)
║  .kick, .add, .promote
║  .demote, .tagall, .hidetag
║  .mute, .unmute, .ban
║  .tempban, .unban, .banlist
║
║  👤 USER (8)
║  .ping, .info, .menu
║  .myperms, .owner, .admins
║  .cmd
║
║  📝 VARIABLES:
║  @user, @time, @date
║
║  ⏱️ TIME: 30m, 2h, 1d
║
╚══════════════════════════╝`;
                        
                        await sock.sendMessage(sender, { text: addTinyLogo(cmdInfo) });
                    }
                }
                
                // ===== OWNER COMMANDS =====
                else if (command === 'allow' && getUserLevel(m.sender) === 'owner') {
                    const cmdToAllow = args[0];
                    const targetUser = args[1]?.replace('@', '')?.split('@')[0];
                    
                    if (!cmdToAllow || !targetUser) {
                        return sock.sendMessage(sender, {
                            text: 'Usage: .allow [command] @user'
                        });
                    }
                    
                    if (!config.userPermissions[targetUser]) {
                        config.userPermissions[targetUser] = [];
                    }
                    
                    if (!config.userPermissions[targetUser].includes(cmdToAllow)) {
                        config.userPermissions[targetUser].push(cmdToAllow);
                        saveDatabase();
                        await sock.sendMessage(sender, {
                            text: `✅ Allowed @${targetUser} to use .${cmdToAllow}`
                        });
                    }
                }
                
                else if (command === 'deny' && getUserLevel(m.sender) === 'owner') {
                    const cmdToDeny = args[0];
                    const targetUser = args[1]?.replace('@', '')?.split('@')[0];
                    
                    if (config.userPermissions[targetUser]) {
                        const index = config.userPermissions[targetUser].indexOf(cmdToDeny);
                        if (index > -1) {
                            config.userPermissions[targetUser].splice(index, 1);
                            saveDatabase();
                            await sock.sendMessage(sender, {
                                text: `✅ Removed .${cmdToDeny} from @${targetUser}`
                            });
                        }
                    }
                }
                
                else if (command === 'addadmin' && getUserLevel(m.sender) === 'owner') {
                    const target = args[0]?.replace('@', '')?.split('@')[0];
                    if (!target) return sock.sendMessage(sender, { text: '❌ Number do!' });
                    
                    if (!config.admins.includes(target)) {
                        config.admins.push(target);
                        saveDatabase();
                        await sock.sendMessage(sender, {
                            text: `✅ @${target} added as admin!`
                        });
                    }
                }
                
                else if (command === 'removeadmin' && getUserLevel(m.sender) === 'owner') {
                    const target = args[0]?.replace('@', '')?.split('@')[0];
                    const index = config.admins.indexOf(target);
                    if (index > -1) {
                        config.admins.splice(index, 1);
                        saveDatabase();
                        await sock.sendMessage(sender, {
                            text: `✅ @${target} removed from admin!`
                        });
                    }
                }
                
                else if (command === 'banuser' && getUserLevel(m.sender) === 'owner') {
                    const target = args[0]?.replace('@', '')?.split('@')[0];
                    if (!config.banned.includes(target)) {
                        config.banned.push(target);
                        saveDatabase();
                        await sock.sendMessage(sender, {
                            text: `🚫 @${target} banned from bot!`
                        });
                    }
                }
                
                else if (command === 'unbanuser' && getUserLevel(m.sender) === 'owner') {
                    const target = args[0]?.replace('@', '')?.split('@')[0];
                    const index = config.banned.indexOf(target);
                    if (index > -1) {
                        config.banned.splice(index, 1);
                        saveDatabase();
                        await sock.sendMessage(sender, {
                            text: `✅ @${target} unbanned!`
                        });
                    }
                }
                
                // ===== ADMIN COMMANDS =====
                else if (command === 'kick' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return sock.sendMessage(sender, { text: '❌ Mention someone!' });
                    
                    await sock.groupParticipantsUpdate(sender, [target], 'remove');
                    await sock.sendMessage(sender, {
                        text: `✅ Kicked @${target.split('@')[0]}`,
                        mentions: [target]
                    });
                }
                
                else if (command === 'add' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const number = args[0]?.replace(/[^0-9]/g, '');
                    if (!number) return sock.sendMessage(sender, { text: '❌ Number do!' });
                    
                    const jid = number + '@s.whatsapp.net';
                    await sock.groupParticipantsUpdate(sender, [jid], 'add');
                    await sock.sendMessage(sender, { text: `✅ Added ${number}` });
                }
                
                else if (command === 'promote' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return sock.sendMessage(sender, { text: '❌ Mention someone!' });
                    
                    await sock.groupParticipantsUpdate(sender, [target], 'promote');
                    await sock.sendMessage(sender, {
                        text: `👑 Promoted @${target.split('@')[0]}`,
                        mentions: [target]
                    });
                }
                
                else if (command === 'demote' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return sock.sendMessage(sender, { text: '❌ Mention someone!' });
                    
                    await sock.groupParticipantsUpdate(sender, [target], 'demote');
                    await sock.sendMessage(sender, {
                        text: `👤 Demoted @${target.split('@')[0]}`,
                        mentions: [target]
                    });
                }
                
                else if (command === 'tagall' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const groupMeta = await sock.groupMetadata(sender);
                    const mentions = groupMeta.participants.map(p => p.id);
                    const msg = args.join(' ') || '📢 Attention everyone!';
                    
                    await sock.sendMessage(sender, { text: msg, mentions });
                }
                
                else if (command === 'ban' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return sock.sendMessage(sender, { text: '❌ Mention someone!' });
                    
                    await sock.groupParticipantsUpdate(sender, [target], 'remove');
                    await sock.sendMessage(sender, {
                        text: `⛔ Banned @${target.split('@')[0]}`,
                        mentions: [target]
                    });
                }
                
                else if (command === 'tempban' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const target = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!target) return sock.sendMessage(sender, { text: '❌ Mention someone!' });
                    
                    const timeStr = args[1] || '1h';
                    const timeMs = parseTime(timeStr);
                    if (!timeMs) return sock.sendMessage(sender, { text: '❌ Invalid time! Use: 30m, 2h, 1d' });
                    
                    await sock.groupParticipantsUpdate(sender, [target], 'remove');
                    
                    setTimeout(async () => {
                        // Auto-unban notification
                        await sock.sendMessage(sender, {
                            text: `✅ @${target.split('@')[0]} auto-unbanned`,
                            mentions: [target]
                        });
                    }, timeMs);
                    
                    await sock.sendMessage(sender, {
                        text: `⏳ Temp banned @${target.split('@')[0]} for ${timeStr}`,
                        mentions: [target]
                    });
                }
                
                else if (command === 'mute' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (!sender.endsWith('@g.us')) return;
                    
                    const timeStr = args[0] || '1h';
                    const timeMs = parseTime(timeStr);
                    
                    if (!config.groupSettings[sender]) config.groupSettings[sender] = {};
                    config.groupSettings[sender].muted = true;
                    saveDatabase();
                    
                    setTimeout(() => {
                        if (config.groupSettings[sender]) {
                            config.groupSettings[sender].muted = false;
                            saveDatabase();
                        }
                    }, timeMs);
                    
                    await sock.sendMessage(sender, {
                        text: `🔇 Group muted for ${timeStr}`
                    });
                }
                
                else if (command === 'unmute' && ['owner', 'admin'].includes(getUserLevel(m.sender))) {
                    if (config.groupSettings[sender]) {
                        config.groupSettings[sender].muted = false;
                        saveDatabase();
                        await sock.sendMessage(sender, { text: '🔊 Group unmuted!' });
                    }
                }
                
            } catch (err) {
                console.error('Command error:', err);
                await sock.sendMessage(sender, {
                    text: `❌ Error: ${err.message}`
                });
            }
        });
        
    } catch (err) {
        console.error('Fatal error:', err);
        setTimeout(() => startBot(), 10000);
    }
}

// Start bot
console.log('🤖 Starting Tanha Bot...');
startBot();
