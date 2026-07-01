require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType
} = require("discord.js");

const util = require("minecraft-server-util");
const cron = require("node-cron");
const fs = require("fs");
const Parser = require("rss-parser");

const ytParser = new Parser();

// ---------------- CLIENT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ---------------- CONFIG ----------------
const STATUS_CHANNEL = "1431553799700480186";
const WELCOME_CHANNEL_ID = "YOUR_WELCOME_CHANNEL_ID";
const LEAVE_CHANNEL_ID = "YOUR_LEAVE_CHANNEL_ID";

const DATA_FILE = "./memeChannels.json";
const YT_FILE = "./youtubeChannels.json";

// ---------------- STORAGE ----------------
function loadJSON(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file));
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------------- MEME ----------------
async function getMeme() {
  const res = await fetch("https://meme-api.com/gimme");
  return await res.json();
}

async function sendMeme(channel) {
  try {
    const meme = await getMeme();

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setTitle(meme.title)
      .setImage(meme.url)
      .setFooter({ text: `👍 r/${meme.subreddit}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
  }
}

// ---------------- SLASH COMMANDS ----------------
const commands = [
  new SlashCommandBuilder().setName("status").setDescription("Minecraft status"),

  new SlashCommandBuilder().setName("meme").setDescription("Send meme"),

  new SlashCommandBuilder()
    .setName("meme-set")
    .setDescription("Set meme channel")
    .addChannelOption(o => o.setName("channel").setRequired(true)),

  new SlashCommandBuilder().setName("meme-disable").setDescription("Disable memes"),

  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Send ticket panel")
    .addChannelOption(o => o.setName("channel").setRequired(true)),

  new SlashCommandBuilder().setName("ticket-close").setDescription("Close ticket"),

  new SlashCommandBuilder()
    .setName("youtube-set")
    .setDescription("Set YouTube alerts channel")
    .addChannelOption(o => o.setName("channel").setRequired(true)),

  new SlashCommandBuilder()
    .setName("youtube-remove")
    .setDescription("Disable YouTube alerts")
].map(c => c.toJSON());

// ---------------- REGISTER ----------------
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Commands ready");
})();

// ---------------- YOUTUBE ----------------
let lastVideoId = null;

async function checkYouTube() {
  const data = loadJSON(YT_FILE);

  for (const guildId in data) {
    const channelId = data[guildId];

    try {
      const feed = await ytParser.parseURL(
        "https://www.youtube.com/feeds/videos.xml?channel_id=YOUR_CHANNEL_ID"
      );

      const latest = feed.items[0];
      if (!latest) return;

      if (latest.id === lastVideoId) return;
      lastVideoId = latest.id;

      const channel = await client.channels.fetch(channelId);

      if (channel) {
        channel.send({
          content: "@everyone",
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle("🎥 New Video Uploaded!")
              .setDescription(`[${latest.title}](${latest.link})`)
              .setTimestamp()
          ]
        });
      }

    } catch (err) {
      console.error(err);
    }
  }
}

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 🌞 Morning
  cron.schedule("0 7 * * *", async () => {
    const ch = await client.channels.fetch(STATUS_CHANNEL);
    if (ch) ch.send("🌞 Good Morning!");
  }, { timezone: "Asia/Kolkata" });

  // 🌙 Night
  cron.schedule("0 23 * * *", async () => {
    const ch = await client.channels.fetch(STATUS_CHANNEL);
    if (ch) ch.send("🌙 Good Night!");
  }, { timezone: "Asia/Kolkata" });

  // 😂 memes hourly
  setInterval(() => {
    const data = loadJSON(DATA_FILE);
    for (const g in data) {
      client.channels.fetch(data[g]).then(sendMeme).catch(() => {});
    }
  }, 60 * 60 * 1000);

  // 🎥 YouTube check every 2 min
  setInterval(checkYouTube, 2 * 60 * 1000);
});

// ---------------- WELCOME ----------------
client.on("guildMemberAdd", async (member) => {
  try {
    member.send(`👋 Welcome to ${member.guild.name}!`).catch(() => {});

    const ch = await member.guild.channels.fetch(WELCOME_CHANNEL_ID);

    if (ch) {
      ch.send(`${member} joined the server 🎉`);
    }
  } catch {}
});

// ---------------- LEAVE ----------------
client.on("guildMemberRemove", async (member) => {
  try {
    const ch = await member.guild.channels.fetch(LEAVE_CHANNEL_ID);

    if (ch) {
      ch.send(`👋 ${member.user.username} left the server`);
    }
  } catch {}
});

// ---------------- INTERACTIONS ----------------
client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  // ---------- STATUS ----------
  if (interaction.commandName === "status") {
    try {
      const status = await util.status("play.gamerlog.fun", 25575);

      return interaction.reply(`${status.players.online}/${status.players.max} players online`);
    } catch {
      return interaction.reply("Server offline");
    }
  }

  // ---------- MEME ----------
  if (interaction.commandName === "meme") {
    await interaction.deferReply();
    const meme = await getMeme();

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Random")
          .setTitle(meme.title)
          .setImage(meme.url)
      ]
    });
  }

  if (interaction.commandName === "meme-set") {
    const ch = interaction.options.getChannel("channel");

    const data = loadJSON(DATA_FILE);
    data[interaction.guild.id] = ch.id;
    saveJSON(DATA_FILE, data);

    return interaction.reply(`✅ Meme channel set`);
  }

  if (interaction.commandName === "meme-disable") {
    const data = loadJSON(DATA_FILE);
    delete data[interaction.guild.id];
    saveJSON(DATA_FILE, data);

    return interaction.reply("❌ Disabled");
  }

  // ---------- YOUTUBE ----------
  if (interaction.commandName === "youtube-set") {
    const ch = interaction.options.getChannel("channel");

    const data = loadJSON(YT_FILE);
    data[interaction.guild.id] = ch.id;
    saveJSON(YT_FILE, data);

    return interaction.reply(`🎥 YouTube alerts set`);
  }

  if (interaction.commandName === "youtube-remove") {
    const data = loadJSON(YT_FILE);
    delete data[interaction.guild.id];
    saveJSON(YT_FILE, data);

    return interaction.reply("❌ YouTube alerts removed");
  }

  // ---------- TICKET ----------
  if (interaction.commandName === "ticket-panel") {
    const ch = interaction.options.getChannel("channel");

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket")
        .setPlaceholder("Select category")
        .addOptions(
          { label: "Report", value: "report" },
          { label: "Purchase", value: "purchase" },
          { label: "Partner", value: "partner" },
          { label: "Other", value: "other" }
        )
    );

    return ch.send({
      embeds: [new EmbedBuilder().setTitle("🎫 Tickets")],
      components: [menu]
    }).then(() => interaction.reply("Sent"));
  }

  if (interaction.commandName === "ticket-close") {
    await interaction.reply("Closing...");
    setTimeout(() => interaction.channel.delete(), 3000);
  }

  // ---------- MENU ----------
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket") {

      const type = interaction.values[0];

      const channel = await interaction.guild.channels.create({
        name: `${type}-${interaction.user.id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }
        ]
      });

      return interaction.reply({ content: `Created ${channel}`, ephemeral: true });
    }
  }
});

// ---------------- LOGIN ----------------
client.login(process.env.TOKEN);
