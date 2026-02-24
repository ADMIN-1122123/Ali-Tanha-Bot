const fs = require('fs');

class BotConfig {
    constructor() {
        // 👇 YEH BADLO — APNA NUMBER LIKHO (country code ke saath)
        // PAKISTAN: 92XXXXXXXXXX, INDIA: 91XXXXXXXXXX
        this.owner = "923275420358";  // APNA NUMBER YAHAN LIKHO!
        
        this.botName = "Tanha Bot";
        this.version = "2.0";
        this.prefix = ".";
        this.admins = [];
        this.userPermissions = {};
        this.banned = [];
    }
    
    getUserLevel(userJid) {
        const user = userJid.split('@')[0];
        if (this.banned.includes(user)) return 'banned';
        if (this.owner === user) return 'owner';
        if (this.admins.includes(user)) return 'admin';
        return 'user';
    }
}

module.exports = new BotConfig();
