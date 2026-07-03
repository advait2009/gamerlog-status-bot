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

// ---------------- CLIENT ----------------
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ---------------- CONFIG ----------------
const STATUS_CHANNEL = "1431553799700480186";
const DATA_FILE = "./memeChannels.json";

// ---------------- STORAGE ----------------
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------------- MEME API ----------------
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
    console.error("Meme error:", err);
  }
}

// ---------------- COMMANDS ----------------
const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Minecraft server status"),

  new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Send a random meme"),

  new SlashCommandBuilder()
    .setName("meme-set")
    .setDescription("Set meme channel")
    .addChannelOption(o =>
      o.setName("channel").setDescription("Channel").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("meme-disable")
    .setDescription("Disable auto memes"),

  new SlashCommandBuilder()
    .setName("ticket-panel")
    .setDescription("Send ticket panel")
    .addChannelOption(o =>
      o.setName("channel").setDescription("Channel").setRequired(true)
    ),

 new SlashCommandBuilder()
  .setName("ticket-close")
  .setDescription("Close ticket"),

new SlashCommandBuilder()
  .setName("goodmorning")
  .setDescription("Send Good Morning message")
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

new SlashCommandBuilder()
  .setName("goodnight")
  .setDescription("Send Good Night message")
  .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Commands registered");
})();

// ---------------- READY ----------------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 🌞 Morning
// 🌞 Morning
cron.schedule("0 7 * * *", async () => {
  const ch = await client.channels.fetch(STATUS_CHANNEL);
  if (!ch) return;

  ch.send({
    content: "@everyone",
    embeds: [
      new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("🌞 Good Morning!")
        .setDescription("Have a great day ☀️")
    ],
    allowedMentions: {
      parse: ["everyone"]
    }
  });
}, { timezone: "Asia/Kolkata" });

// 🌙 Night
cron.schedule("0 23 * * *", async () => {
  const ch = await client.channels.fetch(STATUS_CHANNEL);
  if (!ch) return;

  ch.send({
    content: "@everyone",
    embeds: [
      new EmbedBuilder()
        .setColor("DarkBlue")
        .setTitle("🌙 Good Night!")
        .setDescription("Sleep well 😴")
    ],
    allowedMentions: {
      parse: ["everyone"]
    }
  });
}, { timezone: "Asia/Kolkata" });

  // 😂 Auto meme every 1 hour
  setInterval(async () => {
    const data = loadData();

    for (const guildId in data) {
      try {
        const ch = await client.channels.fetch(data[guildId]);
        if (ch) sendMeme(ch);
      } catch {}
    }
  }, 60 * 60 * 1000);
});

// ---------------- INTERACTIONS ----------------
client.on("interactionCreate", async (interaction) => {

  // ================= STATUS =================
  if (interaction.commandName === "status") {
    try {
      const status = await util.status("play.gamerlog.fun", 25575);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("🟢 Server Status")
            .addFields(
              { name: "Players", value: `${status.players.online}/${status.players.max}` },
              { name: "Version", value: status.version.name },
              { name: "Ping", value: `${status.roundTripLatency} ms` }
            )
        ]
      });

    } catch {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("🔴 Server Offline")
        ]
      });
    }
  }

  // ================= MEME =================
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

    const data = loadData();
    data[interaction.guild.id] = ch.id;
    saveData(data);

    return interaction.reply(`✅ Meme channel set to ${ch}`);
  }

  if (interaction.commandName === "meme-disable") {
    const data = loadData();
    delete data[interaction.guild.id];
    saveData(data);

    return interaction.reply("❌ Auto memes disabled");
  }
  // ================= GOOD MORNING =================
if (interaction.commandName === "goodmorning") {
  return interaction.reply({
    content: "@everyone",
    embeds: [
      new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("🌞 Good Morning!")
        .setDescription("Have a great day ☀️")
    ],
    allowedMentions: {
      parse: ["everyone"]
    }
  });
}

// ================= GOOD NIGHT =================
if (interaction.commandName === "goodnight") {
  return interaction.reply({
    content: "@everyone",
    embeds: [
      new EmbedBuilder()
        .setColor("DarkBlue")
        .setTitle("🌙 Good Night!")
        .setDescription("Sleep well 😴")
    ],
    allowedMentions: {
      parse: ["everyone"]
    }
  });
}

  // ================= TICKET PANEL =================
  if (interaction.commandName === "ticket-panel") {
    const ch = interaction.options.getChannel("channel");

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("ticket_category")
        .setPlaceholder("Select Ticket Type")
        .addOptions(
          { label: "Report Player", value: "report", emoji: "🚨" },
          { label: "Purchase", value: "purchase", emoji: "💰" },
          { label: "Partnership", value: "partner", emoji: "🤝" },
          { label: "Other", value: "other", emoji: "❓" }
        )
    );

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("🎫 Support Tickets")
      .setDescription("Select category to open a ticket");

    await ch.send({ embeds: [embed], components: [menu] });

    return interaction.reply("✅ Ticket panel created");
  }

  // ================= CLOSE TICKET =================
  if (interaction.commandName === "ticket-close") {
    if (!interaction.channel.name.includes("ticket")) {
      return interaction.reply({ content: "❌ Not a ticket channel", ephemeral: true });
    }

    await interaction.reply("🔒 Closing ticket...");
    setTimeout(() => interaction.channel.delete(), 3000);
  }

  // ================= BUTTONS & MENU =================
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "ticket_category") {

      const type = interaction.values[0];
      const id = interaction.user.id;

      let name = `${type}-${id}`;
      let title = "🎫 Ticket";

      if (type === "report") title = "🚨 Report Ticket";
      if (type === "purchase") title = "💰 Purchase Ticket";
      if (type === "partner") title = "🤝 Partnership Ticket";
      if (type === "other") title = "❓ General Ticket";

      const channel = await interaction.guild.channels.create({
        name,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]
      });

      const closeBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("close_ticket")
          .setLabel("🔒 Close Ticket")
          .setStyle(ButtonStyle.Danger)
      );

      channel.send({
        content: `<@${id}>`,
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle(title)
            .setDescription("Support will respond soon.")
        ],
        components: [closeBtn]
      });

      return interaction.reply({
        content: `✅ Ticket created: ${channel}`,
        ephemeral: true
      });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === "close_ticket") {
      await interaction.reply("🔒 Closing ticket...");
      setTimeout(() => interaction.channel.delete(), 3000);
    }
  }
});

// ---------------- LOGIN ----------------
client.login(process.env.TOKEN);
