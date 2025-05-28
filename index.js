const connectToWhatsApp = require('./lib/connect');
const { default: makeWASocket } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = new Map();

// Load all commands
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.set(command.name, command);
}

const sock = connectToWhatsApp();

sock.ev.on('messages.upsert', async ({ messages }) => {
  const msg = messages[0];
  if (!msg.message || msg.key.fromMe) return;

  const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
  if (!body.startsWith(config.prefix)) return;

  const args = body.slice(config.prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(sock, msg, args);
  } catch (err) {
    console.error('Command error:', err);
    await sock.sendMessage(msg.key.remoteJid, { text: '🚫 Error running command.' }, { quoted: msg });
  }
});
