// admin-wallet.js
// Ajusta la ruta a tu base de datos. Si este archivo está en la raíz, suele ser './dbInit'
const { Users } = require('./dbInit'); 

// Obtenemos los argumentos de la consola
// node admin-wallet.js <USER_ID> <AMOUNT>
const args = process.argv.slice(2);
const userId = args[0];
const amount = parseInt(args[1]);

// Validaciones básicas
if (!userId || isNaN(amount)) {
    console.error('❌ Error de uso. Debes escribir: node admin-wallet.js <ID_USUARIO> <CANTIDAD>');
    process.exit(1);
}

(async () => {
    try {
        console.log(`⏳ Buscando usuario ${userId}...`);
        
        // Buscamos al usuario (usando la misma lógica que tu comando)
        const user = await Users.findByPk(userId);

        if (!user) {
            console.error('❌ El usuario no existe en la base de datos. Asegúrate de que haya hablado al menos una vez.');
            // Opcional: Si quieres crearlo si no existe, usarías Users.create(...)
            return;
        }

        // Modificamos el saldo
        const previousBalance = user.balance;
        user.balance += amount;
        await user.save();

        console.log(`✅ ÉXITO:`);
        console.log(`   Usuario: ${userId}`);
        console.log(`   Anterior: ${previousBalance}`);
        console.log(`   Añadido: ${amount}`);
        console.log(`   Nuevo Saldo: ${user.balance}`);

    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error);
    } finally {
        // Cerramos el proceso al terminar
        process.exit();
    }
})();