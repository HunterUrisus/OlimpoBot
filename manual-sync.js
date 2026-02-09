const fs = require('fs');
const path = require('path');
const readline = require('readline');
const nbt = require('prismarine-nbt');
const { MinecraftPlayers, MinecraftPlaytime } = require('./dbInit'); 

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

async function main() {
    console.log("--- SINCRONIZACIÓN DESDE ARCHIVOS .DAT (CORREGIDO) ---");
    
    // 1. Configuración Inicial
    const folderPath = await ask("Ingresa la ruta completa de la carpeta 'playerdata':\n(Ej: C:\\Users\\Server\\world\\playerdata): ");
    
    if (!fs.existsSync(folderPath)) {
        console.error("❌ La carpeta no existe.");
        process.exit(1);
    }

    const dateInput = await ask("Fecha para registrar estas horas (YYYY-MM-DD) [Ej: 2026-01-20]: ");
    if (!dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.error("❌ Formato de fecha inválido.");
        process.exit(1);
    }

    // 2. Leer archivos
    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.dat'));
    console.log(`\n📂 Se encontraron ${files.length} archivos de jugadores.\n`);

    let count = 0;

    for (const file of files) {
        count++;
        const uuid = file.replace('.dat', '');
        const fullPath = path.join(folderPath, file);

        console.log(`------------------------------------------------`);
        console.log(`[${count}/${files.length}] Procesando UUID: ${uuid}`);

        try {
            // 3. Leer y Parsear NBT (Sin promisify, usando await directo)
            const buffer = fs.readFileSync(fullPath);
            
            // prismarine-nbt devuelve { parsed, type, metadata }
            const { parsed } = await nbt.parse(buffer);

            if (!parsed) {
                throw new Error("El archivo NBT no pudo ser interpretado (parsed es null).");
            }

            // 4. Intentar encontrar el nombre dentro del NBT de forma segura
            // Usamos optional chaining (?.) para evitar crasheos si la ruta no existe
            let username = "Desconocido";

            // Estructura típica Spigot/Paper: root -> value -> bukkit -> value -> lastKnownName
            // A veces 'bukkit' está en minúsculas o mayúsculas
            const bukkitTag = parsed.value?.bukkit || parsed.value?.Bukkit;

            if (bukkitTag?.value?.lastKnownName?.value) {
                username = bukkitTag.value.lastKnownName.value;
                console.log(`👤 Nombre detectado en archivo: ${username}`);
            } else {
                console.log("⚠️ No se encontró la etiqueta 'Bukkit.lastKnownName' en el archivo.");
                // Si falla, mostramos las llaves disponibles para depurar visualmente
                // console.log("Etiquetas encontradas:", Object.keys(parsed.value || {}));
                
                username = await ask(">> Ingresa el nombre del jugador manualmente: ");
            }

            // 5. Interacción de Datos
            const input = await ask(`¿Ingresar horas para [${username}]? (s/n/salir): `);
            if (input.toLowerCase() === 'salir') break;
            if (input.toLowerCase() !== 's') {
                console.log("Saltando...");
                continue;
            }

            const days = parseInt(await ask("Días: ") || "0");
            const hours = parseInt(await ask("Horas: ") || "0");
            const minutes = parseInt(await ask("Minutos: ") || "0");

            const totalSecondsToAdd = (days * 86400) + (hours * 3600) + (minutes * 60);

            if (totalSecondsToAdd > 0) {
                // A. Tabla Jugadores
                const [player] = await MinecraftPlayers.findOrCreate({
                    where: { id: uuid },
                    defaults: { 
                        username: username,
                        hours_played: 0,
                        last_joined: new Date(dateInput)
                    }
                });

                if (player.username !== username) {
                    player.username = username;
                    await player.save();
                }

                // B. Tabla Historial
                const [log] = await MinecraftPlaytime.findOrCreate({
                    where: { 
                        player_id: uuid, 
                        date: dateInput 
                    },
                    defaults: { seconds_played: 0 }
                });

                await log.increment('seconds_played', { by: totalSecondsToAdd });
                console.log(`✅ Guardado: ${days}d ${hours}h ${minutes}m añadidos a ${username}.`);
            } else {
                console.log("No se añadieron horas (0 tiempo).");
            }

        } catch (error) {
            console.error(`❌ Error procesando el archivo ${file}:`, error);
        }
    }

    console.log("\n✅ Proceso finalizado.");
    process.exit(0);
}

main();