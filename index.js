const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function iniciarBot() {
    // La carpeta 'sesion_franky' guardará tus credenciales automáticamente
    const { state, saveCreds } = await useMultiFileAuthState('./sesion_franky');
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Usamos código de 8 dígitos
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Si no está registrado, pedirá el número en los logs
    if (!client.authState.creds.registered) {
        console.log("\n========================================");
        console.log("SISTEMA DE VINCULACIÓN FRANKY BOT");
        console.log("========================================\n");
        
        const numero = await question('Escribe tu número con código de país (ej: 50212345678): ');
        
        // Generamos el código de 8 dígitos
        setTimeout(async () => {
            let code = await client.requestPairingCode(numero.trim());
            console.log(`\n👉 TU CÓDIGO DE VINCULACIÓN ES: ${code}\n`);
            console.log("Introdúcelo en tu WhatsApp -> Dispositivos Vinculados.");
        }, 3000);
    }

    // Guarda los cambios en la sesión automáticamente
    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const error = lastDisconnect.error?.output?.statusCode;
            // Si no es un cierre de sesión manual, se reconecta solo
            if (error !== DisconnectReason.loggedOut) {
                iniciarBot();
            }
        } else if (connection === 'open') {
            console.log('✅ ¡Bot Conectado y sesión guardada con éxito!');
        }
    });

    // Escuchador de mensajes (Aquí puedes añadir tus comandos)
    client.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const from = msg.key.remoteJid;

        if (texto.toLowerCase() === '!ping') {
            await client.sendMessage(from, { text: '¡Franky Bot está activo en Railway! 🚀' });
        }
    });
}

iniciarBot();
