const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mc-online-list")
    .setDescription("Muestra la lista de jugadores en línea."),
  async execute(interaction) {
    const serverIp = process.env.SERVER_IP;

    try {
      const response = await fetch(
        `https://api.mcstatus.io/v2/status/java/${serverIp}`
      );
      if (!response.ok) {
        console.error(`Error al contactar la API: ${response.statusText}`);
        await interaction.reply(
          "No se pudo obtener la lista de jugadores en línea."
        );
        return;
      }
      const data = await response.json();

      const embed = new EmbedBuilder();

      if (data.online && data.players.list.length > 0) {
        const playerList = data.players.list;
        
        if (playerList.length === 0) {
          embed
            .setTitle("Jugadores en línea")
            .setDescription("No hay jugadores en línea en este momento.")
            .setColor("#E67E22");

          await interaction.reply({ embeds: [embed] });
        } else {
          // Si hay alguien conectado
          const title = `Hay ${playerList.length} jugadores en línea:`;
          embed
            .setTitle(title)
            .setColor("#57F287") // Un verde vibrante
            .addFields({
              name: `Conectados (${data.players.online}/${data.players.max})`,
              value: "```\n" + playerList.map((player) => player.name_raw).join("\n") + "\n```", // El bloque de código lo hace ver muy bien
              inline: false,
            });

          await interaction.reply({
            embeds: [embed],
          });
        }
      } else {
        await interaction.reply("No hay jugadores en línea en este momento.");
      }
    } catch (error) {
      console.error(
        "No se pudo obtener la lista de jugadores en línea:",
        error
      );
      await interaction.reply(
        "Error al obtener la lista de jugadores en línea."
      );
    }
  },
};
