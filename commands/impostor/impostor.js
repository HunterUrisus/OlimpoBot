const {
  valorant_jugadores,
  valorant_agentes,
  lol_campeones,
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
          { name: "Pro Players Valorant", value: "valorant_jugadores" },
          { name: "Agentes Valorant", value: "valorant_agentes" },
          { name: "Campeones de Lol", value: "lol_campeones" }
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

    let embed = modifyEmbed(playerList);

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
      time: 30_000,
    });

    const hostCollector = await hostMessage.createMessageComponentCollector({
      time: 30_000,
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
          embed = modifyEmbed(playerList);
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
          embed = modifyEmbed(playerList);
          await i.update({ embeds: [embed] });
        } else {
          await i.reply({
            content: "No estás en la partida",
            flags: MessageFlags.Ephemeral,
          });
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
        collector.stop("time");
        await i.update({
          content: "Comenzando partida",
          components: [],
        });
        await i.deleteReply();
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason == "time") {
        if (playerList.length == 0) {
          interaction.editReply({
            content: "No se unió ningún jugador. Partida cancelada.",
            embeds: [],
            components: [],
          });
        } else {
          interaction.editReply({
            content: "Comenzando partida...",
            embeds: [embed],
            components: [],
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
          playerList.forEach((player) => {
            if (player.id === impostor.id) {
              player.send(`Impostor`);
            } else {
              player.send(chosenWord);
            }
          });

        }
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

function modifyEmbed(playerList) {
  const newEmbed = new EmbedBuilder();
  if (playerList.length == 0) {
    return newEmbed
      .setTitle("Partida de Impostor:")
      .setColor("#E74C3C")
      .addFields({
        name: "Jugadores:",
        value: "No hay jugadores en la partida",
        inline: false,
      });
  } else {
    const playerUsernames = playerList.map((user) => user.username);
    return newEmbed
      .setTitle("Partida de Impostor:")
      .setColor("#E74C3C")
      .addFields({
        name: `Jugadores (${playerList.length}):`,
        value: "```\n" + playerUsernames.join("\n") + "\n```",
        inline: false,
      });
  }
}

function sendMessage(playerList) {
  playerList.forEach((player) => {
    player.send("Te has unido a la partida de Impostor!");
  });
}

function getWordsByCategory(category) {
  switch (category) {
    case "valorant_jugadores":
      return valorant_jugadores;
    case "valorant_agentes":
      return valorant_agentes;
    case "lol_campeones":
      return lol_campeones;
    default:
      return [];
  }
}
