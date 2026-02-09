const {
  Events,
  TextDisplayBuilder,
  MessageFlags,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  AttachmentBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require("discord.js");
const { getServerInfo } = require("../util/server-info");
const { MinecraftPlayers, MinecraftPlaytime } = require("../dbInit");
const {
  getHoursPlayed,
  getWeeklyStats,
  getMonthlyStats,
  getLastSeen,
} = require("../util/server-time-played");

const localState = {
  server: {
    online: false,
    players: 0,
    max: 0,
    player_list: [],
    version: "Unknown",
    ip: "library-proposals.gl.joinmc.link",
  },
  stats: {
    total: [],
    weekly: [],
    monthly: [],
    lastSeen: [],
  },
  viewIndex: 0,
  lastStatusWasOnline: null,
};

const getTargetMessage = async (client) => {
  const channelId = process.env.CHANNEL_ID;
  if (!channelId) return console.error("Falta CHANNEL_ID en .env");

  const channel = await client.channels.fetch(channelId);
  if (!channel) return null;

  const messages = await channel.messages.fetch({ limit: 10 });

  const foundMessage = messages.find((msg) => msg.author.id === client.user.id);

  if (foundMessage) return foundMessage;

  const initialText = new TextDisplayBuilder().setContent(
    "Iniciando monitor...",
  );
  return await channel.send({
    components: [initialText],
    flags: MessageFlags.IsComponentsV2,
  });
};

const formatLeaderboard = (title, data, type = "time") => {
  if (!data || data.length === 0)
    return `## ${title}\n\`\`\`\nCargando datos o lista vacía...\n\`\`\``;

  const list = data
    .map((user, index) => {
      const username = user.minecraft_player?.username || user.username;

      if (type === "date") {
        const isOnline = localState.server.player_list.some(
          (p) => p.name === username,
        );

        let dateDisplay;
        if (isOnline) {
          dateDisplay = "🟢 Online";
        } else {
          dateDisplay = user.last_joined
            ? new Date(user.last_joined).toLocaleString("es-CL", {
                timeZone: "America/Santiago",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "N/A";
        }

        return `${index + 1}. ${username}: ${dateDisplay}`;
      } else {
        const totalSeconds = user.get("total_seconds") || 0;
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return days > 0
          ? `${index + 1}. ${username}: ${days}d ${hours}h ${minutes}min`
          : hours === 0
            ? `${index + 1}. ${username}: ${minutes}min`
            : `${index + 1}. ${username}: ${hours}h ${minutes}min`;
      }
    })
    .join("\n");

  return `## ${title}\n\`\`\`\n${list}\n\`\`\``;
};

const generateComponents = () => {
  const playersDisplay =
    localState.server.players === 0
      ? "## Jugadores en línea: `0`"
      : `## Personas conectadas (${localState.server.players} de ${localState.server.max}):\n` +
        "```\n" +
        localState.server.player_list.map((p) => p.name).join("\n") +
        "\n```";

  let currentContent;
  switch (localState.viewIndex) {
    case 0:
      currentContent = formatLeaderboard(
        "Tiempo Total (Top 15)",
        localState.stats.total,
        "time",
      );
      break;
    case 1:
      currentContent = formatLeaderboard(
        "Últimos 7 Días (Top 15)",
        localState.stats.weekly,
        "time",
      );
      break;
    case 2:
      currentContent = formatLeaderboard(
        "Últimos 30 Días (Top 15)",
        localState.stats.monthly,
        "time",
      );
      break;
    case 3:
      currentContent = formatLeaderboard(
        "Última Conexión (Top 15)",
        localState.stats.lastSeen,
        "date",
      );
      break;
    default:
      currentContent = "Cargando...";
  }

  const statusContainer = new ContainerBuilder()
    .setAccentColor(localState.server.online ? 65376 : 16729413)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(
          "attachment://olimpocraft_logo.png",
        ),
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({
        spacing: SeparatorSpacingSize.Small,
        divider: true,
      }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Información:\n\`\`\`\nIP: ${localState.server.ip}\nVersión: ${localState.server.version}\n\`\`\``,
      ),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Estado: \`${localState.server.online ? "ONLINE" : "OFFLINE"}\``,
      ),
    );

  if (localState.server.online) {
    statusContainer.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(playersDisplay),
    );
  }

  const leaderboardContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(currentContent),
  );

  return [statusContainer, leaderboardContainer];
};

const refreshDiscordMessage = async (client) => {
  const message = await getTargetMessage(client);
  if (!message) return;

  const components = generateComponents();
  const file = new AttachmentBuilder("./assets/olimpocraft_logo.png", {
    name: "olimpocraft_logo.png",
  });

  try {
    await message.edit({
      components: components,
      files: [file],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    console.error("Error actualizando mensaje:", err);
  }
};

const taskUpdatePlaytimeDB = async () => {
  if (!localState.server.online || localState.server.player_list.length === 0)
    return;

  const today = new Date();

  for (const player of localState.server.player_list) {
    const [playerRecord, created] = await MinecraftPlayers.findOrCreate({
      where: { id: player.id },
      defaults: {
        username: player.name,
        hours_played: 0,
        last_joined: new Date(),
      },
    });

    playerRecord.last_joined = new Date();
    if (playerRecord.username !== player.name) {
      playerRecord.username = player.name;
    }
    await playerRecord.save();

    const [log] = await MinecraftPlaytime.findOrCreate({
      where: { player_id: player.id, date: today },
      defaults: { seconds_played: 0 },
    });

    await log.increment("seconds_played", { by: 5 });
  }
};

const taskCheckServerStatus = async (client) => {
  const response = await getServerInfo();

  let hasChanged = false;

  if (!response) {
    if (localState.server.online === true) hasChanged = true;

    localState.server.online = false;
    localState.server.players = 0;
    localState.server.player_list = [];
  } else {
    // Si estaba offline y pasó a online
    if (localState.server.online === false) hasChanged = true;

    // Si cambió el número de jugadores
    if (localState.server.players !== response.players.online)
      hasChanged = true;

    localState.server.online = true;
    localState.server.players = response.players.online;
    localState.server.max = response.players.max;
    localState.server.player_list = response.players.sample || [];
    localState.server.version = response.version.name;
  }

  if (hasChanged) {
    await refreshDiscordMessage(client);
  }
};

const taskUpdateLeaderboardData = async () => {
  try {
    const total = await getHoursPlayed();
    const weekly = await getWeeklyStats();
    const monthly = await getMonthlyStats();
    const lastSeen = await getLastSeen();

    localState.stats.total = total;
    localState.stats.weekly = weekly;
    localState.stats.monthly = monthly;
    localState.stats.lastSeen = lastSeen;

    console.log("Datos de estadísticas actualizados en caché.");
  } catch (error) {
    console.error("Error actualizando datos de leaderboard:", error);
  }
};

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    await taskUpdateLeaderboardData();
    await taskCheckServerStatus(client);

    setInterval(async () => {
      await taskCheckServerStatus(client);
      await taskUpdatePlaytimeDB();
    }, 5000);

    setInterval(async () => {
      await taskUpdateLeaderboardData();
    }, 60000);

    setInterval(async () => {
      localState.viewIndex = (localState.viewIndex + 1) % 4;

      await refreshDiscordMessage(client);
    }, 10000);
  },
};
