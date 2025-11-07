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
    await interaction.deferReply();
    await startLobby(interaction);
  },
};

async function startLobby(interaction) {
  const playerList = [];
  const category = interaction.options.getString("category");
  const buttons = createButtons();

  let embed = modifyEmbed(playerList, category);

  //Mensaje inicial
  const response = await interaction.editReply({
    embeds: [embed],
    components: [{ type: 1, components: [buttons.join, buttons.exit] }],
  });

  const hostMessage = await interaction.followUp({
    content: "# Eres el host de la partida",
    flags: MessageFlags.Ephemeral,
    components: [{ type: 1, components: [buttons.start, buttons.cancel] }],
  });

  const collector = await response.createMessageComponentCollector({
    time: 45_000,
  });

  const hostCollector = await hostMessage.createMessageComponentCollector({
    time: 45_000,
  });

  // Collector join and exit
  collector.on("collect", async (i) => {
    if (i.customId === "join") {
      if (playerList.some((player) => player.id === i.user.id)) {
        await i.reply({
          content: "Ya estás en la partida",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        playerList.push(i.user);
        embed = modifyEmbed(playerList, category);
        await i.update({ embeds: [embed] });
      }
    }

    if (i.customId === "exit") {
      if (playerList.some((player) => player.id === i.user.id)) {
        // Eliminar al jugador de la lista
        const index = playerList.findIndex((player) => player.id === i.user.id);
        playerList.splice(index, 1);
        embed = modifyEmbed(playerList, category);
        await i.update({ embeds: [embed] });
      } else {
        // Do nothing
        embed = modifyEmbed(playerList, category);
        await i.update({ embeds: [embed] });
      }
    }
  });

  // Collector start and cancel by host
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
      if (playerList.length < 3) {
          await i.reply({
            content: "Se necesitan al menos 3 jugadores para iniciar la partida",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

      hostCollector.stop();
      collector.stop("hostStart");
      await i.update({
        content: "Comenzando partida",
        components: [],
      });
    }
  });

  collector.on("end", async (collected, reason) => {

    if (reason == "hostStart") {
      if (playerList.length == 0) {
        await cancelGame(interaction, "No se unió ningún jugador.");
      } else {
        await runGame(interaction, playerList, embed, category);
      }
    } else {
      const reasonText =
        reason === "time"
          ? "Tiempo de espera agotado."
          : "Partida cancelada por el host.";
      await cancelGame(interaction, reasonText);
    }
  });
}

async function runGame(interaction, playerList, embed, category) {
  //1. Obtener palabras e impostor
  const words = getWordsByCategory(category);
  if (!words || words.length === 0) {
    await cancelGame(interaction, "Error al obtener las palabras.");
    return;
  }

  const chosenWord = words[Math.floor(Math.random() * words.length)];
  const impostor = playerList[Math.floor(Math.random() * playerList.length)];

  //2. Enviar mensajes privados
  await sendPlayerDMs(playerList, impostor, chosenWord, category);

  //3. Orden de juego
  const playerOrder = playerList
    .map((player) => player.username)
    .sort(() => Math.random() - 0.5);

  embed.addFields({
    name: "Orden de juego (aleatorio):",
    value: "```\n" + playerOrder.join("\n") + "\n```",
  });

  await interaction.editReply({ embeds: [embed], components: [] });
}

async function sendPlayerDMs(playerList, impostor, chosenWord, category) {
  const dmPromises = playerList.map((player) => {
    const privateMessage = new EmbedBuilder()
      .setTitle("Partida de Impostor:")
      .setDescription("Categoría: " + category)
      .setColor("#E74C3C");
    
    if (player.id === impostor.id) {
      privateMessage.addFields({
        name: "Rol:",
        value: "Impostor",
      });
    } else {
      privateMessage.addFields({
        name: "Palabra secreta:",
        value: chosenWord,
      });
    }

    return player.send({embeds: [privateMessage]}).catch((error) => {
      console.log(
        `Error al enviar mensaje privado a ${player.username}:`,
        error
      );
      return { status: "failed", player: player.username };
    });
  });

  await Promise.allSettled(dmPromises);
}

async function cancelGame(interaction, reason) { 
  await interaction.editReply({
    content: reason,
    embeds: [],
    components: [],
  });
}

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
      return valorant_jugadores;
    case "AgentesValorant":
      return valorant_agentes;
    case "CampeonesLol":
      return lol_campeones;
    case "CartasClashRoyale":
      return cartasClashRoyale;
    default:
      return [];
  }
}

function createButtons() {
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

  return { join, exit, start, cancel };
}
