const { Events, ActivityType } = require("discord.js");
const { getServerInfo } = require("../util/server-info");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    const updateActivity = async () => {
      try {
        const response = await getServerInfo();
        if (!response) {
          client.user.setActivity("Servidor offline", {
            type: ActivityType.Playing,
          });
          return;
        }

        const playerCount = response.players.online;
        const maxPlayers = response.players.max;
        client.user.setActivity(
          `${playerCount} de ${maxPlayers} jugadores en OlimpoCraft Eternal`,
          {
            type: ActivityType.Watching,
          },
        );
      } catch (error) {
        console.error(
          "No se pudo obtener el estado del servidor de Minecraft:",
          error,
        );
        client.user.setActivity("Servidor offline", {
          type: ActivityType.Playing,
        });
      }
    };

    updateActivity();

    setInterval(updateActivity, 5000); // 5000 ms = 5 segundos
  },
};
