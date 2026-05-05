const { Client, GatewayIntentBits, Collection, Events, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Partials, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const config = {
    adminRole: '1500501084429484288',
    ownerRole: '1500501084429484289',
    dbPath: './data/database.json',
    ordersPath: './data/orders.json',
    rrPath: './data/react_role_config.json',
    helpPath: './data/help_commands.json',
    arConfigPath: './data/autorole_config.json',
    ticketPath: './data/ticket_config.json',
    arPath: './data/autoreply_config.json',
    autoReactPath: './data/autoreact_config.json',
    bankSTK: '109882846725',
    bankName: 'VietinBank'
};

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers 
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Khởi tạo thư mục và file dữ liệu
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
const initFiles = (p, d) => { if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(d, null, 2)); };
initFiles(config.dbPath, { products: [], stock: {}, orderCount: 0 });
initFiles(config.ordersPath, {});
initFiles(config.helpPath, []);
initFiles(config.arConfigPath, { enabled: false, roleId: null });
initFiles(config.arPath, { trigger: "hello", response: "Xin chào!" });
initFiles(config.autoReactPath, []);
// Cập nhật cấu trúc Ticket mặc định có mảng options
initFiles(config.ticketPath, { 
    targetChannelId: null, 
    categoryId: null, 
    panelMsgId: null, 
    ticketCount: 0, 
    options: [{ label: 'Hỗ trợ chung', value: 'ho_tro_chung' }],
    embed: { title: '📩 TRUNG TÂM HỖ TRỢ SERENPAY', description: 'Vui lòng chọn danh mục cần hỗ trợ bên dưới.', image: '', color: '#000000', footer: 'SerenPay System' } 
});

// --- TẢI COMMANDS ---
client.commands = new Collection();
const commandsList = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsList.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsList });
        console.log('✅ Hệ thống Slash Commands đã sẵn sàng!');
    } catch (error) { console.error('❌ Lỗi đăng ký lệnh:', error); }
})();

// --- HÀM KHÔI PHỤC HỆ THỐNG ---
async function recoverySystem(client) {
    console.log('🔄 Đang khôi phục các hệ thống...');
    for (const guild of client.guilds.cache.values()) {
        // Khôi phục bảng hàng
        const db = JSON.parse(fs.readFileSync(config.dbPath, 'utf8'));
        if (db.setupChannelId && db.setupMessageId) {
            try {
                const channel = await guild.channels.fetch(db.setupChannelId).catch(() => null);
                if (channel) {
                    await channel.messages.fetch(db.setupMessageId).catch(() => null);
                    await refreshSetupEmbed(guild);
                }
            } catch (e) {}
        }
        // Khôi phục Ticket Panel
        const ticketData = JSON.parse(fs.readFileSync(config.ticketPath, 'utf8'));
        if (ticketData.panelMsgId && ticketData.targetChannelId) {
            try {
                const channel = await guild.channels.fetch(ticketData.targetChannelId).catch(() => null);
                if (channel) await channel.messages.fetch(ticketData.panelMsgId).catch(() => null);
            } catch (e) {}
        }
    }
    console.log('✅ Khôi phục hoàn tất!');
}

client.once(Events.ClientReady, async c => {
    console.log(`🚀 Bot Sẵn Sàng: ${c.user.tag}`);
    await recoverySystem(c);
});

// --- HÀM CẬP NHẬT BẢNG HÀNG TỰ ĐỘNG ---
async function refreshSetupEmbed(guild) {
    if (!fs.existsSync(config.dbPath)) return;
    const inventoryData = JSON.parse(fs.readFileSync(config.dbPath, 'utf8'));
    if (!inventoryData.setupMessageId || !inventoryData.setupChannelId) return;
    try {
        const channel = await guild.channels.fetch(inventoryData.setupChannelId);
        const message = await channel.messages.fetch(inventoryData.setupMessageId);
        let statusText = "";
        const selectOptions = [];
        inventoryData.products.forEach(p => {
            const stockCount = (inventoryData.stock && inventoryData.stock[p.name]) ? inventoryData.stock[p.name].length : 0;
            statusText += `${p.emoji || '🔹'} **${p.name.toUpperCase()}**\n└ 💵 Giá: \`${p.price.toLocaleString()}\` VNĐ — 📦 Kho: \`${stockCount}\` \n\n`;
            selectOptions.push({ label: p.name.toUpperCase(), description: `Giá: ${p.price.toLocaleString()} VNĐ`, value: `buy_${p.name}`, emoji: p.emoji || '🔹' });
        });
        const newEmbed = EmbedBuilder.from(message.embeds[0]).setDescription('Chào mừng bạn đến với hệ thống mua hàng tự động.\n\n**📊 TÌNH TRẠNG KHO HÀNG**\n──────────────────────────\n' + statusText + '──────────────────────────');
        const newRow = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('select_product').setPlaceholder('Chọn một món hàng để mua...').addOptions(selectOptions));
        await message.edit({ embeds: [newEmbed], components: [newRow] });
    } catch (e) {}
}

// --- XỬ LÝ TƯƠNG TÁC TỔNG HỢP ---
client.on(Events.InteractionCreate, async interaction => {
    // 1. XỬ LÝ SELECT MENU
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select_product') return await handleShopPurchase(interaction);
        
        // TICKET: User chọn mục mở ticket hoặc Admin chọn mục để xóa
        if (interaction.customId === 'user_select_ticket' || interaction.customId === 'admin_del') {
            const ticketCmd = client.commands.get('ticket_panel');
            if (ticketCmd) return await ticketCmd.handleInteraction(interaction);
        }

        if (interaction.customId.startsWith('m_rr_')) {
            const rr = client.commands.get('rr_admin');
            if (rr) await rr.handleInteraction(interaction);
        }
    }

    // 2. XỬ LÝ SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) try { await command.execute(interaction); } catch (e) { console.error(e); }
        return;
    }

    // 3. XỬ LÝ BUTTONS
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('payconfirm_')) return await handleShopConfirm(interaction);

        // Shop / AutoRole Buttons
        if (interaction.customId === 'btn_edit_autoreply') {
            const modal = new ModalBuilder().setCustomId('m_edit_autoreply').setTitle('Chỉnh sửa Phản hồi tự động');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ar_trigger_input').setLabel("TỪ KHÓA").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ar_response_input').setLabel("NỘI DUNG TRẢ LỜI").setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        if (interaction.customId === 'ar_toggle' || interaction.customId === 'ar_set_role') {
             // Giữ nguyên logic cũ của bạn ở đây...
             if (interaction.customId === 'ar_toggle') {
                let arConfig = JSON.parse(fs.readFileSync(config.arConfigPath, 'utf8'));
                arConfig.enabled = !arConfig.enabled;
                fs.writeFileSync(config.arConfigPath, JSON.stringify(arConfig, null, 2));
                return await interaction.update({ content: `✅ Đã ${arConfig.enabled ? 'BẬT' : 'TẮT'} Auto Role!`, embeds: [], components: [] });
            }
            if (interaction.customId === 'ar_set_role') {
                const modal = new ModalBuilder().setCustomId('m_ar_set_role').setTitle('Thiết lập Auto Role');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ar_role_input').setLabel("ID ROLE").setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }
        }

        // TICKET: Các nút điều khiển ticket (Đóng, Thêm mục, Xóa mục, v.v)
        const ticketCmd = client.commands.get('ticket_panel');
        if (ticketCmd) await ticketCmd.handleInteraction(interaction).catch(()=>{});

        // React Role Buttons
        if (interaction.customId.startsWith('rr_')) {
            const rr = client.commands.get('rr_admin');
            if (rr) await rr.handleInteraction(interaction).catch(()=>{});
        }
    }

    // 4. XỬ LÝ MODAL SUBMIT
    if (interaction.isModalSubmit()) {
        // Ticket Modals (m_ids, m_add)
        if (interaction.customId === 'm_ids' || interaction.customId === 'm_add') {
            const ticketCmd = client.commands.get('ticket_panel');
            if (ticketCmd) return await ticketCmd.handleInteraction(interaction);
        }

        if (interaction.customId === 'm_edit_autoreply') {
            const trigger = interaction.fields.getTextInputValue('ar_trigger_input');
            const response = interaction.fields.getTextInputValue('ar_response_input');
            fs.writeFileSync(config.arPath, JSON.stringify({ trigger, response }, null, 2));
            return await interaction.reply({ content: '✅ Đã cập nhật phản hồi tự động!', ephemeral: true });
        }
        if (interaction.customId === 'm_ar_set_role') {
            const newRoleId = interaction.fields.getTextInputValue('ar_role_input');
            let arConfig = JSON.parse(fs.readFileSync(config.arConfigPath, 'utf8'));
            arConfig.roleId = newRoleId;
            fs.writeFileSync(config.arConfigPath, JSON.stringify(arConfig, null, 2));
            return await interaction.reply({ content: `✅ Đã cập nhật Auto Role!`, ephemeral: true });
        }
    }
});

// --- LỆNH CHAT & AUTO REACT --- (Giữ nguyên)
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return;
    if (fs.existsSync(config.arPath)) {
        const arConfig = JSON.parse(fs.readFileSync(config.arPath, 'utf8'));
        if (message.content.toLowerCase() === arConfig.trigger.toLowerCase()) return message.reply(arConfig.response);
    }
    if (fs.existsSync(config.autoReactPath)) {
        const autoReactList = JSON.parse(fs.readFileSync(config.autoReactPath, 'utf8'));
        const match = autoReactList.find(item => message.content.toLowerCase().includes(item.trigger.toLowerCase()));
        if (match) {
            for (const emoji of match.emojis) {
                try { await message.react(emoji).catch(() => null); } catch (e) {}
            }
        }
    }
    if (message.content === '.stock') {
        const stockInfo = JSON.parse(fs.readFileSync(config.dbPath));
        const stockEmbed = new EmbedBuilder().setTitle('📦 TRẠNG THÁI KHO HÀNG').setColor('#3498db');
        let desc = "";
        stockInfo.products.forEach(p => {
            const count = (stockInfo.stock[p.name] || []).length;
            desc += `${p.emoji || '🔹'} **${p.name.toUpperCase()}**\n➜ Kho: ${count > 0 ? `\`${count}\` cái` : "❌ **Hết hàng**"} | Giá: \`${p.price.toLocaleString()}\`đ\n\n`;
        });
        stockEmbed.setDescription(desc || "Trống");
        return message.reply({ embeds: [stockEmbed] });
    }
});

// --- SHOP HELPERS --- (Giữ nguyên)
async function handleShopPurchase(interaction) {
    if (interaction.replied || interaction.deferred) return;
    await interaction.deferReply({ ephemeral: true });
    try {
        const productName = interaction.values[0].replace('buy_', '');
        let shopData = JSON.parse(fs.readFileSync(config.dbPath));
        const product = shopData.products.find(p => p.name === productName);
        if (!product || (shopData.stock[productName] || []).length === 0) return interaction.editReply('❌ Hết hàng!');
        shopData.orderCount = (shopData.orderCount || 0) + 1;
        const txCode = `SERENPAY${shopData.orderCount}`;
        fs.writeFileSync(config.dbPath, JSON.stringify(shopData, null, 2));
        const qrUrl = `https://img.vietqr.io/image/${config.bankName.toLowerCase()}-${config.bankSTK}-compact2.jpg?amount=${product.price}&addInfo=${encodeURIComponent(txCode)}`;
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`payconfirm_${txCode}_${productName}`).setLabel('Tôi đã chuyển khoản').setStyle(ButtonStyle.Success));
        const embed = new EmbedBuilder().setTitle('💳 THÔNG TIN THANH TOÁN').setDescription(`Mua: **${productName.toUpperCase()}**\n\nMã đơn: \`${txCode}\`\nTiền: \`${product.price.toLocaleString()}đ\``).setImage(qrUrl).setColor('#f1c40f');
        await interaction.user.send({ embeds: [embed], components: [row] }).catch(() => {});
        await interaction.editReply(`✅ Đã gửi mã QR vào DM!`);
    } catch (e) { await interaction.editReply('❌ Lỗi hệ thống.'); }
}

async function handleShopConfirm(interaction) {
    const [, txCode, productName] = interaction.customId.split('_');
    let orderData = JSON.parse(fs.readFileSync(config.ordersPath));
    orderData[txCode] = { userId: interaction.user.id, productName, time: new Date().toLocaleString('vi-VN') };
    fs.writeFileSync(config.ordersPath, JSON.stringify(orderData, null, 2));
    await interaction.reply({ content: `✅ Đã ghi nhận mã đơn **${txCode}**.`, ephemeral: true });
}

// --- REACTIONS & AUTO ROLE --- (Giữ nguyên)
client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();
    const rrConfig = JSON.parse(fs.readFileSync(config.rrPath, 'utf-8'));
    if (reaction.message.id !== rrConfig.panelMsgId) return;
    const roleData = rrConfig.roles.find(r => r.emoji === (reaction.emoji.id || reaction.emoji.name));
    if (roleData) {
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.add(roleData.roleId).catch(() => {});
    }
});

client.on(Events.GuildMemberAdd, async (member) => {
    const arConfig = JSON.parse(fs.readFileSync(config.arConfigPath, 'utf8'));
    if (arConfig.enabled && arConfig.roleId) {
        const role = member.guild.roles.cache.get(arConfig.roleId);
        if (role) await member.roles.add(role).catch(() => {});
    }
});

client.login(process.env.TOKEN);