const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mc-online-list")
    .setDescription("Muestra la lista de jugadores en línea."),
  async execute(interaction) {
    const serverIp = process.env.SERVER_IP;

    // 1. Difieres la respuesta (¡Correcto!)
    await interaction.deferReply();

    try {
      const response = await fetch(
        `https://api.mcstatus.io/v2/status/java/${serverIp}`
      );

      if (!response.ok) {
        console.error(`Error al contactar la API: ${response.statusText}`);
        // 2. CORREGIDO: Se usa .editReply()
        await interaction.editReply(
          "No se pudo obtener la lista de jugadores en línea (Error de API)."
        );
        return;
      }

      const data = await response.json();
      const embed = new EmbedBuilder();

      // 3. LÓGICA SIMPLIFICADA:
      // Comprobamos si el servidor está online Y si la lista de jugadores existe Y si no está vacía.
      if (data.online && data.players.list && data.players.list.length > 0) {
        
        // Mapeamos los nombres directamente
        const playerListString = data.players.list
          .map((player) => player.name_raw)
          .join("\n");

        embed
          .setTitle(`Hay ${data.players.online} jugadores en línea:`)
          .setColor("#57F287") // Verde vibrante
          .addFields({
            name: `Conectados (${data.players.online}/${data.players.max})`,
            value: "```\n" + playerListString + "\n```",
            inline: false,
          });

        // 4. CORREGIDO: Se usa .editReply()
        await interaction.editReply({ embeds: [embed] });
        
      } else {
        // 5. CASO UNIFICADO:
        // Si el servidor está offline o está online pero vacío.
        embed
          .setTitle("Servidor Solitario")
          .setDescription("No hay jugadores en línea en este momento.")
          .setColor("#E67E22"); // Naranja

        // 6. CORREGIDO: Se usa .editReply()
        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error(
        "No se pudo obtener la lista de jugadores en línea:",
        error
      );
      // 7. CORREGIDO: Se usa .editReply()
      await interaction.editReply(
        "Error al obtener la lista de jugadores en línea."
      );
    }
  },
};