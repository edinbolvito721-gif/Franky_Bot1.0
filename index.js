const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function iniciarBot() {
    // Aquí se guarda la sesión para que no pida código siempre
    const { state, saveCreds } = await useMultiFileAuthState('sesion_franky');
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Usaremos código, no QR
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // --- LÓGICA DE VINCULACIÓN POR CÓDIGO ---
    if (!client.authState.creds.registered) {
        console.log("-----------------------------------------");
        const numero = await question('Escribe tu número con código de país (ej: 50212345678): ');
        const codigo = await client.requestPairingCode(numero.trim());
        console.log(`\n👉 TU CÓDIGO ES: ${codigo}\n`);
        console.log("Ponlo en tu WhatsApp: Dispositivos vinculados > Vincular con código.");
        console.log("-----------------------------------------");
    }

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const error = lastDisconnect.error?.output?.statusCode;
            if (error !== DisconnectReason.loggedOut) iniciarBot();
        } else if (connection === 'open') {
            console.log('✅ Franky_Bot1.0 Conectado!');
        }
    });

    // --- MANEJADOR DE MENSAJES (EVENTOS) ---
    client.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const sender = msg.key.remoteJid;

        // Comandos de prueba
        if (texto.toLowerCase() === 'hola') {
            await client.sendMessage(sender, { text: '¡Hola! Soy el bot de Edin. Escribe *!menu* para ver qué puedo hacer.' });
        }

        if (texto.toLowerCase() === '!menu') {
            await client.sendMessage(sender, { text: '📋 *MENÚ DE FRANKY BOT*\n\n1. !info\n2. !ping' });
        }
    });
}

iniciarBot();
