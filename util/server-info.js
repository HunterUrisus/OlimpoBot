const util = require("minecraft-server-util");

module.exports = {
    async getServerInfo() {
        const serverIp = process.env.SERVER_IP;
        const serverPort = parseInt(process.env.SERVER_PORT) || 25565;

        try {
            return await util.status(serverIp, serverPort, { timeout: 5000 });
        } catch (error) {
            return null;
        }
    }
}