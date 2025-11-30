const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");

const { Users } = require("../../dbInit");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("casino")
    .setDescription("Comandos del casino")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("football_studio")
        .setDescription("Juega Football Studio")
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "football_studio") {
      await handleFootballStudio(interaction);
    }
  },
};

async function handleFootballStudio(interaction) {
  await interaction.deferReply();

  await startFootballStudioLobby(interaction);
}

async function startFootballStudioLobby(interaction) {
  //Mensaje de bienvenida y botones
  const playerList = [];
  let bettingOpen = true; // Control para abrir/cerrar apuestas
  
  const createEquipoButtons = () => [
    new ButtonBuilder()
      .setCustomId("local")
      .setLabel("Local")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("empate")
      .setLabel("Empate")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("visitante")
      .setLabel("Visitante")
      .setStyle(ButtonStyle.Success),
  ];

  const createMontoButtons = () => [
    new ButtonBuilder()
      .setCustomId("monto50")
      .setLabel("50 OlimpoCoins")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("monto100")
      .setLabel("100 OlimpoCoins")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("monto200")
      .setLabel("200 OlimpoCoins")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("monto500")
      .setLabel("500 OlimpoCoins")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("monto1000")
      .setLabel("1000 OlimpoCoins")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("monto5000")
      .setLabel("5000 OlimpoCoins")
      .setStyle(ButtonStyle.Secondary),
  ];

  let embed = footballStudioModifyEmbed(playerList);

  const response = await interaction.editReply({
    embeds: [embed],
    components: [{ type: 1, components: createEquipoButtons() }],
  });

  const collector = await response.createMessageComponentCollector({
    time: 15000,
  });

  collector.on("collect", async (i) => {
    try {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      
      // Validar si las apuestas están abiertas
      if (!bettingOpen) {
        await i.editReply({
          content: "❌ Las apuestas ya están cerradas. La partida ha comenzado.",
        });
        return;
      }
      
      const userAlreadyBet = playerList.find(p => p.userId === i.user.id);
      
      if (!userAlreadyBet) {
        // Obtener el balance del usuario
        const user = await Users.findByPk(i.user.id);
        const userBalance = user ? user.balance : 0;

        // Montos disponibles: 50, 100, 200, 500, 1000, 5000
        const availableMontos = [50, 100, 200, 500, 1000, 5000].filter(
          (monto) => monto <= userBalance
        );

        if (availableMontos.length === 0) {
          await i.editReply({
            content: `No tienes suficientes OlimpoCoins para apostar. Tu balance es: **${userBalance}** 💰`,
          });
          return;
        }

        // Mostrar mensaje efímero con opciones de monto
        const montoEmbed = new EmbedBuilder()
          .setTitle("Selecciona tu apuesta")
          .setDescription(
            `¿Cuánto deseas apostar al equipo ${i.customId.toUpperCase()}?\n\n**Tu balance:** ${userBalance} 💰`
          )
          .setColor(0x0099ff);

        const montoButtonMap = {
          50: "monto50",
          100: "monto100",
          200: "monto200",
          500: "monto500",
          1000: "monto1000",
          5000: "monto5000",
        };

        const montoButtons = availableMontos.map((monto) => {
          return new ButtonBuilder()
            .setCustomId(montoButtonMap[monto])
            .setLabel(`${monto} OlimpoCoins`)
            .setStyle(ButtonStyle.Secondary);
        });

        // Distribuir botones en filas (máx 5 por fila)
        const rows = [];
        for (let i = 0; i < montoButtons.length; i += 5) {
          rows.push({
            type: 1,
            components: montoButtons.slice(i, i + 5),
          });
        }

        await i.editReply({
          embeds: [montoEmbed],
          components: rows,
        });

        try {
          const filter = (interaction) => interaction.user.id === i.user.id;
          const montoInteraction = await i.channel.awaitMessageComponent({
            filter,
            time: 10000,
          });

          // Validar nuevamente si las apuestas siguen abiertas
          if (!bettingOpen) {
            await montoInteraction.update({
              content: "❌ Las apuestas fueron cerradas mientras seleccionabas tu monto.",
              embeds: [],
              components: [],
            });
            return;
          }

          if (!montoInteraction.customId.startsWith("monto")) {
            return;
          }

          const monto = montoInteraction.customId.replace("monto", "");
          const equipo = i.customId;

          // Agregar a la lista de jugadores con monto y equipo
          playerList.push({
            userId: i.user.id,
            monto: parseInt(monto),
            equipo: equipo,
          });

          // Actualizar el embed principal
          embed = footballStudioModifyEmbed(playerList);
          await response.edit({ embeds: [embed] });

          const resultEmbed = new EmbedBuilder()
            .setTitle("Apuesta confirmada")
            .setDescription(`Has apostado **${monto}** OlimpoCoins al equipo **${equipo.toUpperCase()}**`)
            .setColor(0x00ff00);

          await montoInteraction.update({
            embeds: [resultEmbed],
            components: [],
          });
        } catch (error) {
          console.error("Error en awaitMessageComponent:", error.message);
        }
      } else {
        await i.reply({
          content: "Ya has hecho una apuesta en este juego.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error("Error en collector:", error);
    }
  });

  // Cuando termina el tiempo de apuestas
  collector.on("end", async (collected) => {
    bettingOpen = false;

    try {
      // Generar números aleatorios del 1 al 13 para cada equipo
      const localScore = Math.floor(Math.random() * 13) + 1;
      const visitanteScore = Math.floor(Math.random() * 13) + 1;

      // Crear el embed inicial mostrando solo Local
      const embed1 = new EmbedBuilder()
        .setTitle("Football Studio - Resultados 📊")
        .setDescription(`Apuestas cerradas. Jugadores finales: ${playerList.length}`)
        .addFields({
          name: "Resultados",
          value: `🔵 Local: **${localScore}**`,
          inline: false,
        })
        .setColor(0x0099ff);

      const playerInfo = playerList.map((player) => {
        const equipoEmoji = player.equipo === 'local' ? '🔵' : player.equipo === 'empate' ? '⚪' : '🟢';
        return `${equipoEmoji} <@${player.userId}> - ${player.monto} 💰`;
      }).join("\n");

      if (playerList.length > 0) {
        embed1.addFields({
          name: `Jugadores (${playerList.length}):`,
          value: playerInfo,
          inline: false,
        });
      } else {
        embed1.addFields({
          name: "Jugadores:",
          value: "Nadie realizó apuestas",
          inline: false,
        });
      }

      await response.edit({
        embeds: [embed1],
        components: [],
      });

      // Esperar 5 segundos
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Mostrar visitante
      const embed2 = new EmbedBuilder()
        .setTitle("Football Studio - Resultados 📊")
        .setDescription(`Apuestas cerradas. Jugadores finales: ${playerList.length}`)
        .addFields({
          name: "Resultados",
          value: `🔵 Local: **${localScore}**\n🟢 Visitante: **${visitanteScore}**`,
          inline: false,
        })
        .setColor(0x0099ff);

      if (playerList.length > 0) {
        embed2.addFields({
          name: `Jugadores (${playerList.length}):`,
          value: playerInfo,
          inline: false,
        });
      } else {
        embed2.addFields({
          name: "Jugadores:",
          value: "Nadie realizó apuestas",
          inline: false,
        });
      }

      await response.edit({
        embeds: [embed2],
        components: [],
      });

      // Esperar 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Determinar ganador
      let ganador = "";
      let color = 0xff0000;
      let equipoGanador = null;
      
      if (localScore > visitanteScore) {
        ganador = `🏆 ¡Ganó LOCAL! (${localScore} - ${visitanteScore})`;
        color = 0x0099ff;
        equipoGanador = "local";
      } else if (visitanteScore > localScore) {
        ganador = `🏆 ¡Ganó VISITANTE! (${visitanteScore} - ${localScore})`;
        color = 0x00ff00;
        equipoGanador = "visitante";
      } else {
        ganador = `⚖️ ¡EMPATE! (${localScore} - ${visitanteScore})`;
        color = 0xffff00;
        equipoGanador = "empate";
      }

      // Actualizar balances de los jugadores
      const updatedPlayers = [];
      for (const player of playerList) {
        const user = await Users.findByPk(player.userId);
        if (user) {
          let newBalance = user.balance - player.monto; // Restar la apuesta original
          
          if (equipoGanador === "empate" && player.equipo === "empate") {
            // Si fue empate y apostaron al empate: multiplicar x11
            newBalance = user.balance + (player.monto * 11);
          } else if (equipoGanador !== "empate" && player.equipo === equipoGanador) {
            // Si ganó un equipo y apostaron a ese equipo: multiplicar x2
            newBalance = user.balance + (player.monto * 2);
          }
          // Si perdieron: newBalance ya tiene (user.balance - player.monto) = 0
          
          user.balance = newBalance;
          await user.save();
          
          updatedPlayers.push({
            userId: player.userId,
            equipo: player.equipo,
            montoApostado: player.monto,
            nuevoBalance: newBalance,
            resultado: equipoGanador === "empate" && player.equipo === "empate" ? "✅ Ganó x11" : 
                      equipoGanador !== "empate" && player.equipo === equipoGanador ? "✅ Ganó x2" : 
                      "❌ Perdió"
          });
        }
      }

      // Crear el texto con los resultados actualizados
      const updatedPlayerInfo = updatedPlayers.map((player) => {
        const equipoEmoji = player.equipo === 'local' ? '🔵' : player.equipo === 'empate' ? '⚪' : '🟢';
        return `${equipoEmoji} <@${player.userId}> - Apostó: ${player.montoApostado} 💰 ${player.resultado} | Balance: ${player.nuevoBalance}`;
      }).join("\n");

      // Mostrar resultado final
      const finalEmbed = new EmbedBuilder()
        .setTitle("Football Studio - Resultado Final 🎯")
        .setDescription(`Partida finalizada. Jugadores: ${playerList.length}`)
        .addFields({
          name: "Resultados",
          value: `🔵 Local: **${localScore}**\n🟢 Visitante: **${visitanteScore}**`,
          inline: false,
        })
        .addFields({
          name: "Ganador",
          value: ganador,
          inline: false,
        });

      if (updatedPlayers.length > 0) {
        finalEmbed.addFields({
          name: `Resultados de Jugadores (${updatedPlayers.length}):`,
          value: updatedPlayerInfo,
          inline: false,
        });
      } else {
        finalEmbed.addFields({
          name: "Jugadores:",
          value: "Nadie realizó apuestas",
          inline: false,
        });
      }

      finalEmbed.setColor(color);

      await response.edit({
        embeds: [finalEmbed],
        components: [],
      });
    } catch (error) {
      console.error("Error al cerrar apuestas:", error.message);
    }
  });
}

function footballStudioModifyEmbed(playerList) {
  const newEmbed = new EmbedBuilder()
    .setTitle("Football Studio - Apuesta OlimpoCoins")
    .setDescription(`Jugadores unidos: ${playerList.length}`)
    .setColor(0x00ff00);
  
  if (playerList.length === 0) {
    newEmbed.addFields({
      name: "Jugadores:",
      value: "Nadie se ha unido aún",
      inline: false,
    });
  } else {
    const playerInfo = playerList.map((player) => {
      const equipoEmoji = player.equipo === 'local' ? '🔵' : player.equipo === 'empate' ? '⚪' : '🟢';
      return `${equipoEmoji} <@${player.userId}> - ${player.monto} 💰`;
    }).join("\n");
    newEmbed.addFields({
      name: `Jugadores (${playerList.length}):`,
      value: playerInfo,
      inline: false,
    });
  }
  
  return newEmbed;
}
