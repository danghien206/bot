const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, PermissionFlagsBits, ChannelType, PermissionsBitField, 
    ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/ticket_config.json');

// --- QUẢN LÝ DỮ LIỆU ---
function loadData() {
    const defaultData = {
        targetChannelId: null,
        categoryId: null,
        panelMsgId: null,
        ticketCount: 0,
        options: [{ label: 'Hỗ trợ chung', value: 'ho_tro_chung' }],
        embed: {
            title: '📩SUPPORT SERENDIPITY',
            description: 'Vui lòng chọn danh mục bạn cần hỗ trợ từ menu bên dưới.',
            image: 'https://i.ibb.co/mCT7pwYM/Serendipity-Auto-Buy-text-on-simple-black-background-1.jpg',
            color: '#000000',
            footer: ' Managed by Trần Đăng Hiển'
        }
    };
    try {
        if (!fs.existsSync(dbPath)) {
            if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
            fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 4));
            return defaultData;
        }
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch (e) { return defaultData; }
}

const saveData = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

// --- HÀM ĐỒNG BỘ PANEL ---
async function syncClientPanel(client) {
    const db = loadData();
    if (!db.targetChannelId || !db.panelMsgId) return;

    try {
        const channel = await client.channels.fetch(db.targetChannelId);
        const msg = await channel.messages.fetch(db.panelMsgId);
        
        const embed = new EmbedBuilder()
            .setTitle(db.embed.title)
            .setDescription(db.embed.description)
            .setColor(db.embed.color.startsWith('#') ? db.embed.color : "#000000")
            .setFooter({ text: db.embed.footer });

        if (db.embed.image?.startsWith('http')) embed.setImage(db.embed.image);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('user_select_ticket')
            .setPlaceholder('--- Chọn loại hỗ trợ tại đây ---')
            .addOptions(db.options.map(opt => new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value)));

        await msg.edit({ content: null, embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
    } catch (e) { console.log("⚠️ Lỗi đồng bộ Panel."); }
}

const ownerId = '1114889680484315206';
const adminRoles = ['1500501084429484288', '1500501084429484289'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket_panel')
        .setDescription('Bảng điều khiển Ticket SerenPay')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== ownerId) return interaction.reply({ content: '❌ Không có quyền!', ephemeral: true });
        
        const db = loadData();
        const adminEmbed = new EmbedBuilder()
            .setTitle('🛠️ SERENPAY ADMIN CONTROL')
            .addFields(
                { name: '📍 Kênh hiển thị', value: db.targetChannelId ? `<#${db.targetChannelId}>` : '`Chưa đặt`', inline: true },
                { name: '📂 Danh mục tạo', value: db.categoryId ? `ID: \`${db.categoryId}\`` : '`Chưa đặt`', inline: true },
                { name: '📋 Số mục menu', value: `\`${db.options.length}\``, inline: true }
            ).setColor('#2b2d31');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ids').setLabel('Cài ID Kênh/Cat').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_add_opt').setLabel('Thêm mục').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_del_opt').setLabel('Xóa mục').setStyle(ButtonStyle.Danger)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_ui').setLabel('Sửa Giao Diện').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_send').setLabel('Gửi Panel Mới').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [adminEmbed], components: [row1, row2], ephemeral: true });
    },

    async handleInteraction(i) {
        let db = loadData();

        if (i.isButton()) {
            if (i.customId === 'close_tkt') {
                await i.reply("🔒 Ticket sẽ được xóa sau **5 giây**...");
                return setTimeout(() => i.channel.delete().catch(() => {}), 5000);
            }

            if (i.user.id !== ownerId) return;

            if (i.customId === 'btn_ids') {
                const m = new ModalBuilder().setCustomId('m_ids').setTitle('Cấu hình ID');
                m.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_ch').setLabel("ID KÊNH PANEL").setValue(db.targetChannelId || "").setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_cat').setLabel("ID CATEGORY").setValue(db.categoryId || "").setStyle(TextInputStyle.Short))
                );
                return await i.showModal(m);
            }

            if (i.customId === 'btn_add_opt') {
                const m = new ModalBuilder().setCustomId('m_add').setTitle('Thêm mục hỗ trợ');
                m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_name').setLabel("TÊN MỤC (Ví dụ: Nạp Tiền)").setStyle(TextInputStyle.Short).setRequired(true)));
                return await i.showModal(m);
            }

            if (i.customId === 'btn_del_opt') {
                if (db.options.length === 0) return i.reply({ content: 'Không có mục nào để xóa!', ephemeral: true });
                const menu = new StringSelectMenuBuilder().setCustomId('admin_del').setPlaceholder('Chọn mục cần xóa...');
                db.options.forEach(o => menu.addOptions(new StringSelectMenuOptionBuilder().setLabel(o.label).setValue(o.value)));
                return i.reply({ content: 'Chọn mục bạn muốn gỡ bỏ:', components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
            }

            if (i.customId === 'btn_send') {
                const ch = i.client.channels.cache.get(db.targetChannelId);
                if (!ch) return i.reply({ content: '❌ ID kênh panel không hợp lệ!', ephemeral: true });
                
                await i.deferReply({ ephemeral: true });
                
                // Chuẩn bị Embed để gửi thẳng, không qua bước "Đang khởi tạo"
                const embed = new EmbedBuilder()
                    .setTitle(db.embed.title)
                    .setDescription(db.embed.description)
                    .setColor(db.embed.color.startsWith('#') ? db.embed.color : "#000000")
                    .setFooter({ text: db.embed.footer });
                if (db.embed.image?.startsWith('http')) embed.setImage(db.embed.image);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('user_select_ticket')
                    .setPlaceholder('--- Chọn loại hỗ trợ tại đây ---')
                    .addOptions(db.options.map(opt => new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value)));

                const msg = await ch.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
                
                db.panelMsgId = msg.id;
                saveData(db);
                return i.editReply('🚀 Đã gửi panel thành công!');
            }
        }

        if (i.isModalSubmit()) {
            if (i.customId === 'm_ids') {
                db.targetChannelId = i.fields.getTextInputValue('in_ch');
                db.categoryId = i.fields.getTextInputValue('in_cat');
            } else if (i.customId === 'm_add') {
                const name = i.fields.getTextInputValue('in_name');
                const val = name.toLowerCase().replace(/\s+/g, '_');
                if (db.options.find(o => o.value === val)) return i.reply({ content: 'Mục này đã tồn tại!', ephemeral: true });
                db.options.push({ label: name, value: val });
            }
            saveData(db);
            await i.reply({ content: '✅ Cập nhật thành công!', ephemeral: true });
            return await syncClientPanel(i.client);
        }

        if (i.isStringSelectMenu()) {
            if (i.customId === 'admin_del') {
                db.options = db.options.filter(o => o.value !== i.values[0]);
                saveData(db);
                await i.update({ content: '✅ Đã xóa mục!', components: [] });
                return await syncClientPanel(i.client);
            }

            if (i.customId === 'user_select_ticket') {
                if (!db.categoryId) return i.reply({ content: '❌ Hệ thống chưa cài đặt ID Category!', ephemeral: true });
                await i.deferReply({ ephemeral: true });

                db.ticketCount++;
                const selected = db.options.find(o => o.value === i.values[0]);
                const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

                try {
                    const ch = await i.guild.channels.create({
                        name: `🎫-${i.values[0]}-${db.ticketCount}`,
                        type: ChannelType.GuildText,
                        parent: db.categoryId,
                        permissionOverwrites: [
                            { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                            { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                            ...adminRoles.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }))
                        ]
                    });

                    saveData(db);

                    // --- TRANG TRÍ TICKET CHO ĐẸP ---
                    const ticketEmbed = new EmbedBuilder()
                        .setAuthor({ name: 'SERENPAY SUPPORT SYSTEM', iconURL: i.guild.iconURL() })
                        .setTitle('🎫 YÊU CẦU HỖ TRỢ MỚI')
                        .setDescription(`Chào <@${i.user.id}>, yêu cầu của bạn đã được gửi đến đội ngũ Admin.\nVui lòng cung cấp nội dung cần hỗ trợ trong lúc chờ đợi.`)
                        .addFields(
                            { name: '👤 Chủ Ticket', value: `<@${i.user.id}>`, inline: true },
                            { name: '📂 Loại Hỗ Trợ', value: `\`${selected.label}\``, inline: true },
                            { name: '⏰ Thời Gian', value: `\`${timeStr}\``, inline: false },
                            { name: '🆔 User ID', value: `\`${i.user.id}\``, inline: true }
                        )
                        .setColor('#00ff44') // Màu xanh lá sáng
                        .setThumbnail(i.user.displayAvatarURL())
                        .setTimestamp()
                        .setFooter({ text: 'Nhấn nút bên dưới để đóng Ticket này.', iconURL: i.client.user.displayAvatarURL() });

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('close_tkt')
                            .setLabel('Đóng Ticket')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                    await ch.send({ 
                        content: `||<@${i.user.id}> | <@&${adminRoles[0]}>||`, // Ping ẩn để Admin thấy
                        embeds: [ticketEmbed], 
                        components: [row] 
                    });

                    return i.editReply(`✅ Đã mở ticket thành công tại: ${ch}`);
                } catch (e) { 
                    console.error(e);
                    return i.editReply('❌ Lỗi: Kiểm tra quyền Bot hoặc ID Category.'); 
                }
            }
        }
    }
};