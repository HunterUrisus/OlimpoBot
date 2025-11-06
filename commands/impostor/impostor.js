const {
  valorant_jugadores,
  valorant_agentes,
  lol_campeones,
  cartasClashRoyale,
} = require("./resources/words.js");
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("impostor")
    .setDescription("Inicia un juego del impostor")
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Categoría del juego")
        .setRequired(true)
        .addChoices(
          { name: "Pro Players Valorant", value: "JugadoresValorant" },
          { name: "Agentes Valorant", value: "AgentesValorant" },
          { name: "Campeones de Lol", value: "CampeonesLol" },
          { name: "Cartas Clash Royale", value: "CartasClashRoyale" }
        )
    ),
  async execute(interaction) {
    const playerList = [];

    await interaction.deferReply();

    const join = new ButtonBuilder()
      .setCustomId("join")
      .setLabel("Unirse")
      .setStyle(ButtonStyle.Primary);

    const exit = new ButtonBuilder()
      .setCustomId("exit")
      .setLabel("Salir")
      .setStyle(ButtonStyle.Danger);

    const start = new ButtonBuilder()
      .setCustomId("start")
      .setLabel("Iniciar partida")
      .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
      .setCustomId("cancel")
      .setLabel("Cancelar partida")
      .setStyle(ButtonStyle.Danger);

    const again = new ButtonBuilder()
      .setCustomId("again")
      .setLabel("Jugar de nuevo")
      .setStyle(ButtonStyle.Success);

    let embed = modifyEmbed(
      playerList,
      interaction.options.getString("category")
    );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [{ type: 1, components: [join, exit] }],
    });

    const hostMessage = await interaction.followUp({
      content: "# Eres el host de la partida",
      flags: MessageFlags.Ephemeral,
      components: [{ type: 1, components: [start, cancel] }],
    });

    const collector = await response.createMessageComponentCollector({
      time: 45_000,
    });

    const hostCollector = await hostMessage.createMessageComponentCollector({
      time: 45_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "join") {
        if (playerList.some((player) => player.id === i.user.id)) {
          await i.reply({
            content: "Ya estás en la partida",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          playerList.push(i.user);
          embed = modifyEmbed(
            playerList,
            interaction.options.getString("category")
          );
          await i.update({ embeds: [embed] });
        }
      }

      if (i.customId === "exit") {
        if (playerList.some((player) => player.id === i.user.id)) {
          // Eliminar al jugador de la lista
          const index = playerList.findIndex(
            (player) => player.id === i.user.id
          );
          playerList.splice(index, 1);
          embed = modifyEmbed(
            playerList,
            interaction.options.getString("category")
          );
          await i.update({ embeds: [embed] });
        } else {
          // Do nothing
          embed = modifyEmbed(
            playerList,
            interaction.options.getString("category")
          );
          await i.update({ embeds: [embed] });
        }
      }
    });

    hostCollector.on("collect", async (i) => {
      if (i.customId === "cancel") {
        hostCollector.stop();
        collector.stop("hostCancelled");
        await i.update({
          content: "Partida cancelada",
          components: [],
        });
        await i.deleteReply();
      }

      if (i.customId === "start") {
        /* if(playerList.length < 3){
          await i.reply({
            content: "Se necesitan al menos 3 jugadores para iniciar la partida",
            flags: MessageFlags.Ephemeral,
          });
          return;
        } */

        hostCollector.stop();
        collector.stop("hostStart");
        await i.update({
          content: "Comenzando partida",
          components: [],
        });
        await i.deleteReply();
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason == "hostStart") {
        if (playerList.length == 0) {
          interaction.editReply({
            content: "No se unió ningún jugador. Partida cancelada.",
            embeds: [],
            components: [],
          });
        } else {
          const response = await interaction.editReply({
            embeds: [embed],
            components: [{ type: 1, components: [again] }],
          });

          //Conseguir palabras segun categoria
          let words = [];
          const category = interaction.options.getString("category");
          if (category) {
            words = getWordsByCategory(category);
          }

          // Escoger una palabra aleatoria
          const randomIndex = Math.floor(Math.random() * words.length);
          const chosenWord = words[randomIndex];

          // Escoger impostor aleatorio
          const impostorIndex = Math.floor(Math.random() * playerList.length);
          const impostor = playerList[impostorIndex];

          //Enviar mensajes privados

          playerList.forEach(async (player) => {
            const privateMessage = new EmbedBuilder();
            privateMessage
              .setTitle("Partida de Impostor:")
              .setDescription(`Categoría: ${category}`)
              .setColor("#E74C3C");
            if (player.id === impostor.id) {
              privateMessage.addFields({
                name: "Rol:",
                value: "IMPOSTOR",
              });
            } else {
              privateMessage.addFields({
                name: "Palabra:",
                value: `**${chosenWord}**`,
              });
            }
            try {
              await player.send({ content: "", embeds: [privateMessage] });
            } catch (error) {
              console.log(
                `Error al enviar mensaje privado a ${player.username}:`,
                error
              );
            }
          });

          // Indicar el orden aleatorio de juego
          const playerOrder = playerList
            .map((player) => player.username)
            .sort(() => Math.random() - 0.5);

          embed.addFields({
            name: "Orden de juego (aleatorio):",
            value: "```\n" + playerOrder.join("\n") + "\n```",
          });

          const finalResponse = interaction.editReply({ embeds: [embed] });

          const againCollector = response.createMessageComponentCollector({
            time: 120_000,
          });
          againCollector.on("collect", async (i) => {
            if (i.customId === "again") {
              if (i.user.id !== interaction.user.id) {
                await i.reply({
                  content: "Solo el host puede reiniciar la partida",
                  flags: MessageFlags.Ephemeral,
                });
                return;
              }

              againCollector.stop("restarting");

              // Reiniciar la partida
              playerList.length = 0; // Vaciar la lista de jugadores
              embed = modifyEmbed(
                playerList,
                interaction.options.getString("category")
              );
              await i.update({
                content: "Nueva partida",
                embeds: [embed],
                components: [{ type: 1, components: [join, exit] }],
              });

              againCollector.on("end", async (collected, reason) => {
                if (reason !== "restarting") {
                  interaction.editReply({
                    embeds: [embed],
                    components: [],
                  });
                }
              });
            }
          });
        }
      }

      if (reason == "time") {
        interaction.editReply({
          content: "Tiempo de espera agotado. Partida cancelada.",
          embeds: [],
          components: [],
        });
      }

      if (reason == "cancelled") {
        interaction.editReply({
          content: "Partida cancelada.",
          embeds: [],
          components: [],
        });
      }

      if (reason == "hostCancelled") {
        interaction.editReply({
          content: "Partida cancelada por el host.",
          embeds: [],
          components: [],
        });
      }
    });
  },
};

function modifyEmbed(playerList, category) {
  const newEmbed = new EmbedBuilder();
  newEmbed
    .setTitle("Partida de Impostor:")
    .setDescription(`Categoría: ${category}`)
    .setColor("#E74C3C");
  if (playerList.length == 0) {
    return newEmbed.addFields({
      name: "Jugadores:",
      value: "No hay jugadores en la partida",
      inline: false,
    });
  } else {
    const playerUsernames = playerList.map((user) => user.username);
    return newEmbed.addFields({
      name: `Jugadores (${playerList.length}):`,
      value: "```\n" + playerUsernames.join("\n") + "\n```",
      inline: false,
    });
  }
}

function getWordsByCategory(category) {
  switch (category) {
    case "JugadoresValorant":
      return JugadoresValorant;
    case "AgentesValorant":
      return AgentesValorant;
    case "CampeonesLol":
      return CampeonesLol;
    case "CartasClashRoyale":
      return CartasClashRoyale;
    default:
      return [];
  }
}
