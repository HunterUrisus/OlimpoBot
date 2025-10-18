const { Events, ActivityType } = require("discord.js");
module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    const serverIp = "147.185.221.30:59080"; // 👈 ¡IMPORTANTE! Reemplaza esto con la IP de tu servidor.

    const updateActivity = async () => {
      try {
        // Hacemos la petición a la API de mcstatus.io
        const response = await fetch(
          `https://api.mcstatus.io/v2/status/java/${serverIp}`
        );

        if (!response.ok) {
          // Si la API devuelve un error (ej: IP inválida), lo mostramos.
          console.error(`Error al contactar la API: ${response.statusText}`);
          client.user.setActivity("Error al consultar", {
            type: ActivityType.Playing,
          });
          return;
        }

        const data = await response.json();

        // Verificamos si el servidor está en línea
        if (data.online) {
          // El servidor está en línea, mostramos el número de jugadores.
          const playerCount = data.players.online;
          const maxPlayers = data.players.max;
          client.user.setActivity(`${playerCount} de ${maxPlayers} jugadores en OlimpoCraft`, {
            type: ActivityType.Watching,
          });
        } else {
          // El servidor está fuera de línea.
          client.user.setActivity("Servidor Offline", {
            type: ActivityType.Playing,
          });
        }
      } catch (error) {
        console.error(
          "No se pudo obtener el estado del servidor de Minecraft:",
          error
        );
        client.user.setActivity("Error de Conexión", {
          type: ActivityType.Playing,
        });
      }
    };

    updateActivity();

    setInterval(updateActivity, 30000); // 30000 ms = 30 segundos
  },
};
