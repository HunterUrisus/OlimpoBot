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

const checkMessage = async (client) => {
  const channelId = process.env.CHANNEL_ID;
  if (!channelId) {
    console.error("CHANNEL_ID is not defined in .env.");
    return null;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error("No se pudo encontrar el canal con el ID proporcionado.");
      return null;
    }

    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessage = messages.find((msg) => msg.author.id === client.user.id);

    if (!botMessage) {
      console.error("No se encontró mensaje del bot. Creando uno nuevo...");
      const textDisplay = new TextDisplayBuilder().setContent(
        "Obteniendo información del servidor...",
      );
      return await channel.send({
        components: [textDisplay],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    return botMessage;
  } catch (error) {
    console.error("Error encontrando mensaje de información:", error);
    return null;
  }
};

const updateMessage = async (client) => {
  const message = await checkMessage(client);
  if (!message) return;

  const response = await getServerInfo();

  if (!response) {
    // Servidor offline, reflejar en mensaje
    const file = new AttachmentBuilder("./assets/olimpocraft_logo.png", {
      name: "olimpocraft_logo.png",
    });
    const components = [
      new ContainerBuilder()
        .setAccentColor(16729413)
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
            "# Información:\n```\nIP: library-proposals.gl.joinmc.link\nVersión: 1.21.11 (y actualizándose)\nVANILLA + voicechat (plugins)\n```",
          ),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("# Estado: `OFFLINE`"),
        ),
    ];
    await message.edit({
      components: components,
      files: [file],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  // Mensaje de servidor online
  const file = new AttachmentBuilder("./assets/olimpocraft_logo.png", {
    name: "olimpocraft_logo.png",
  });
  const components = [
    new ContainerBuilder()
      .setAccentColor(65376)
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
          "# Información:\n```\nIP: library-proposals.gl.joinmc.link\nVersión: 1.21.11 (y actualizándose)\nVANILLA + voicechat (plugins)\n```",
        ),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Estado: `ONLINE`"),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "## Personas conectadas (" +
            response.players.online +
            " de " +
            response.players.max +
            "):\n```\n" +
            response.players.sample.map((player) => player.name).join("\n") +
            "\n```",
        ),
      ),
  ];

  // Servidor online, actualizar mensaje con info
  message.edit({
    components: components,
    files: [file],
    flags: MessageFlags.IsComponentsV2,
  });
};

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    updateMessage(client);
    setInterval(() => {
      updateMessage(client);
    }, 5000); // Actualiza cada 5 segundos
  },
};
