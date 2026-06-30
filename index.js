require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");

const util = require("minecraft-server-util");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Shows Gamerlog Minecraft server status")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Slash command registered.");
  } catch (err) {
    console.error(err);
  }
})();

client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "status") {
    try {
      const status = await util.status("play.gamerlog.fun", 25575);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🟢 Gamerlog Network")
        .addFields(
          {
            name: "Server",
            value: "`play.gamerlog.fun:25575`"
          },
          {
            name: "Status",
            value: "Online ✅"
          },
          {
            name: "Players",
            value: `${status.players.online}/${status.players.max}`
          },
          {
            name: "Version",
            value: status.version.name
          },
          {
            name: "Ping",
            value: `${status.roundTripLatency} ms`
          }
        )
        .setTimestamp();

      await interaction.reply({
        embeds: [embed]
      });

    } catch (error) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🔴 Gamerlog Network")
        .setDescription("Server is currently Offline.");

      await interaction.reply({
        embeds: [embed]
      });
    }
  }
});

client.login(process.env.TOKEN);
