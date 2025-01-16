const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const chatStates = new Map();
const messageDebounce = new Map();

const client = new Client();

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log('Scan QR code with WhatsApp to login');
});

client.on('ready', () => {
    console.log('Client connected and ready');
});

async function sendMessage(userId, message) {
    try {
        await client.sendMessage(userId, message);
    } catch (error) {
        console.error(`Error sending message to ${userId}:`, error);
    }
}

async function sendMainMenu(userId) {
    const menuText = `Por favor, seleccione una opción:
1. Tiene obligaciones pendientes con alguna entidad financiera  
2. Certificaciones
3. Peticiones Quejas Reclamos Sugerencia 
4. Proveedores
5. Trabaje con nosotros
6. Sobre nosotros`;
    await sendMessage(userId, menuText);
}

async function sendBackToMenuMessage(userId) {
    await sendMessage(userId, "Escriba '0' para volver al menú principal");
}

async function sendEntitiesMenu(userId) {
    const entitiesText = `Su obligación es con:
1. Banco Caja Social 
2. Azzorti 
3. GMF 
4. Microserfil Panamá 
5. Gabrica 
6. Volver al menú principal`;
    await sendMessage(userId, entitiesText);
}

async function handleEntitiesResponse(userId, message) {
    if (message === '6') {
        await sendMainMenu(userId);
        chatStates.set(userId, 'main_Menu');
        return;
    }

    const entities = {
        '1': '573125207598',
        '2': '573102629725',
        '3': '573113590881',
        '4': '5078388521',
        '5': '573217329063'
    };

    if (entities[message]) {
        await sendMessage(userId, `Puede contactar directamente a este número: https://wa.me/${entities[message]}`);
    } else {
        await sendMessage(userId, "Opción no válida.");
    }
    await sendBackToMenuMessage(userId);
}

async function sendWorkOptions(userId) {
    const workOptionsText = `Opciones de trabajo:
1. Asesor`;
    await sendMessage(userId, workOptionsText);
}

async function handleWorkOptionsResponse(userId, message) {
    switch (message) {
        case '1':
            await sendMessage(userId, "Salario 1.300.000$ más comisiones, si te interesa envía tu Hoja de Vida a aux.administrativa@contactosycobranzas.com con el asunto Asesor");
            break;
        default:
            await sendMessage(userId, "Opción no válida.");
    }
    await sendBackToMenuMessage(userId);
}

async function handleMainMenuResponse(userId, message) {
    switch (message) {
        case '1':
            await sendEntitiesMenu(userId);
            chatStates.set(userId, 'entities_Menu');
            break;
        case '2':
            await sendMessage(userId, "Para certificaciones, contacte a: https://wa.me/+573224946351");
            await sendBackToMenuMessage(userId);
            break;
        case '3':
            await sendMessage(userId, "Para PQRS, envíe un correo a info@contactosycobranzas.com");
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sendMessage(userId, "O contacte a este número: https://wa.me/+573224946351");
            await sendBackToMenuMessage(userId);
            break;
        case '4':
            await sendMessage(userId, "Para proveedores, envíe un mensaje a este contacto: https://wa.me/+573224946351");
            await sendBackToMenuMessage(userId);
            break;
        case '5':
            chatStates.set(userId, 'work_options');
            await sendMessage(userId, "¡Genial! Nos alegra que quieras trabajar con nosotros.");
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sendMessage(userId, "Oferta solamente presencial en Bogotá.");
            await new Promise(resolve => setTimeout(resolve, 1500));
            await sendWorkOptions(userId);
            break;
        case '6':
            await sendMessage(userId, "Para conocer más sobre nosotros, visite nuestra página web: https://www.contactosycobranzas.com/");
            await sendBackToMenuMessage(userId);
            break;
        default:
            await sendMessage(userId, "Opción no válida.");
            await sendBackToMenuMessage(userId);
    }
}

async function handleIncomingMessage(userId, message) {
    const messageKey = `${userId}-${message}`;
    const lastMessageTime = messageDebounce.get(messageKey);
    const currentTime = Date.now();
    
    if (lastMessageTime && currentTime - lastMessageTime < 2000) {
        return;
    }
    messageDebounce.set(messageKey, currentTime);
    
    let state = chatStates.get(userId);
    
    if (!state) {
        await sendMessage(userId, "¡Hola! Soy el bot del área administrativa de Contactos y Cobranzas");
        await sendMainMenu(userId);
        chatStates.set(userId, 'main_Menu');
        return;
    }

    const menuVariations = ['0'];
    
    if (menuVariations.includes(message.trim())) {
        await sendMainMenu(userId);
        chatStates.set(userId, 'main_Menu');
        return;
    }
    
    switch (state) {
        case 'main_Menu':
            await handleMainMenuResponse(userId, message);
            break;
        case 'work_options':
            await handleWorkOptionsResponse(userId, message);
            break;
        case 'entities_Menu':
            await handleEntitiesResponse(userId, message);
            break;
        default:
            await sendMessage(userId, "No entiendo tu mensaje.");
            await sendBackToMenuMessage(userId);
    }
}

client.on('message', async (message) => {
    try {
        await handleIncomingMessage(message.from, message.body);
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

client.initialize();
