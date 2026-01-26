const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const util = require("minecraft-server-util");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mc-online-list")
    .setDescription("Muestra la lista de jugadores en línea."),
  async execute(interaction) {
    const serverIp = process.env.SERVER_IP;
    const serverPort = process.env.SERVER_PORT || 25565;

    await interaction.deferReply();

    try {
      const response = await util.status(serverIp, serverPort, { timeout: 5000 });

      const embed = new EmbedBuilder();

      if (response.players.sample && response.players.sample.length > 0) {
        
        const playerListString = response.players.sample
          .map((player) => player.name)
          .join("\n");

        embed
          .setTitle(`Hay ${response.players.online} jugadores en línea:`)
          .setColor("#57F287") // Verde vibrante
          .addFields({
            name: `Conectados (${response.players.online}/${response.players.max})`,
            value: "```\n" + playerListString + "\n```",
            inline: false,
          });

        await interaction.editReply({ embeds: [embed] });
        
      } else {
        embed
          .setTitle("Servidor Solitario")
          .setDescription("No hay jugadores en línea en este momento.")
          .setColor("#E67E22");

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error(
        "No se pudo obtener la lista de jugadores en línea:",
        error
      );

      await interaction.editReply(
        "Error al obtener la lista de jugadores en línea."
      );
    }
  },
};