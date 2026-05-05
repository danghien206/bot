const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/marketplace_db.json');

function loadData() {
    if (!fs.existsSync(dbPath)) {
        const defaultData = {
            title: "🛍️ SERENDIPITY MARKETPLACE",
            desc: "Vui lòng chọn dịch vụ bên dưới để xem chi tiết bảng giá.",
            currentImg: 'https://i.ibb.co/mCT7pwYM/Serendipity-Auto-Buy-text-on-simple-black-background-1.jpg',
            products: [],
            publicMsgId: null,
            adminMsgId: null
        };
        if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 4));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function saveData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('restart')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        const config = {
            ownerId: '1114889680484315206', // Trần Đăng Hiển
            adminRoles: ['1500501084429484288', '1500501084429484289'],
            publicChannelId: '1500501085868265791', 
            adminChannelId: '1500501086384033827'
        };

        const hasAuth = (user, member) => {
            return user.id === config.ownerId || 
                   member.roles.cache.some(r => config.adminRoles.includes(r.id));
        };

        if (!hasAuth(interaction.user, interaction.member)) {
            return interaction.reply({ content: '❌ Bạn không có quyền!', flags: [64] });
        }

        let db = loadData();
        const publicChannel = interaction.client.channels.cache.get(config.publicChannelId);
        const adminChannel = interaction.client.channels.cache.get(config.adminChannelId);

        const updatePublicDisplay = async () => {
            const data = loadData();
            const embed = new EmbedBuilder()
                .setTitle(data.title.toUpperCase())
                .setDescription(data.desc)
                .setImage(`${data.currentImg}?t=${Date.now()}`)
                .setColor('#000000')
                .setFooter({ text: 'SerenPay System — Managed by Trần Đăng Hiển' });

            const options = data.products.length > 0 ? data.products.map((p, i) => ({
                label: p.name,
                value: `view_${i}`,
                emoji: p.emoji || '💎'
            })) : [{ label: 'Hiện chưa có dịch vụ', value: 'none', emoji: '📁' }];

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('user_menu_select')
                    .setPlaceholder('🔍 Chọn dịch vụ bạn quan tâm...')
                    .addOptions(options)
                    .setDisabled(data.products.length === 0)
            );

            try {
                if (data.publicMsgId) {
                    const msg = await publicChannel.messages.fetch(data.publicMsgId);
                    await msg.edit({ embeds: [embed], components: [menu] });
                } else {
                    const sent = await publicChannel.send({ embeds: [embed], components: [menu] });
                    data.publicMsgId = sent.id;
                    saveData(data);
                }
            } catch (e) {
                const sent = await publicChannel.send({ embeds: [embed], components: [menu] });
                data.publicMsgId = sent.id;
                saveData(data);
            }
        };

        const updateAdminPanel = async () => {
            const data = loadData();
            const adminEmbed = new EmbedBuilder()
                .setTitle('🛠️ QUẢN TRỊ MARKETPLACE')
                .addFields(
                    { name: '📦 Dịch vụ', value: `\`${data.products.length}\``, inline: true },
                    { name: '📝 Tiêu đề', value: `\`${data.title}\``, inline: true }
                ).setColor('#2F3136');

            // Hàng 1: Chỉnh sửa giao diện chính
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('admin_edit_title').setLabel('Sửa Tiêu Đề').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('admin_edit_desc').setLabel('Sửa Mô Tả').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('admin_edit_img').setLabel('Sửa Banner').setStyle(ButtonStyle.Primary)
            );
            // Hàng 2: Quản lý sản phẩm
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('admin_add_item').setLabel('Thêm SP').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('admin_edit_item').setLabel('Sửa Nội Dung SP').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('admin_del_item').setLabel('Xóa SP').setStyle(ButtonStyle.Danger)
            );

            try {
                if (data.adminMsgId) {
                    const msg = await adminChannel.messages.fetch(data.adminMsgId);
                    await msg.edit({ embeds: [adminEmbed], components: [row1, row2] });
                } else {
                    const sent = await adminChannel.send({ embeds: [adminEmbed], components: [row1, row2] });
                    data.adminMsgId = sent.id;
                    saveData(data);
                }
            } catch (e) {
                const sent = await adminChannel.send({ embeds: [adminEmbed], components: [row1, row2] });
                data.adminMsgId = sent.id;
                saveData(data);
            }
        };

        await interaction.reply({ content: '✅ Đã đồng bộ Marketplace!', flags: [64] });
        await updatePublicDisplay();
        await updateAdminPanel();

        if (!global.marketplaceInitialized) {
            interaction.client.on('interactionCreate', async i => {
                if (!i.isMessageComponent()) return;
                let currentDb = loadData();
                const filter = m => m.author.id === i.user.id;

                // --- CHO KHÁCH ---
                if (i.customId === 'user_menu_select') {
                    const val = i.values[0];
                    if (val === 'none') return i.deferUpdate();
                    const idx = parseInt(val.split('_')[1]);
                    const product = currentDb.products[idx];
                    if (!product) return i.reply({ content: '❌ Lỗi dữ liệu.', flags: [64] });
                    return i.reply({ content: `## ${product.emoji} ${product.name.toUpperCase()}\n\n${product.detail}`, flags: [64] });
                }

                // --- CHO ADMIN ---
                if (!hasAuth(i.user, i.member)) return;

                // 1. Sửa Tiêu Đề
                if (i.customId === 'admin_edit_title') {
                    await i.reply({ content: '📝 Nhập tiêu đề Marketplace mới:', flags: [64] });
                    const collected = await i.channel.awaitMessages({ filter, max: 1, time: 30000 });
                    if (collected.first()) {
                        currentDb.title = collected.first().content.trim();
                        saveData(currentDb);
                        await updatePublicDisplay(); await updateAdminPanel();
                        collected.first().delete().catch(()=>{});
                    }
                }

                // 2. Sửa Mô Tả Tổng
                if (i.customId === 'admin_edit_desc') {
                    await i.reply({ content: '📑 Nhập mô tả Marketplace mới:', flags: [64] });
                    const collected = await i.channel.awaitMessages({ filter, max: 1, time: 60000 });
                    if (collected.first()) {
                        currentDb.desc = collected.first().content.trim();
                        saveData(currentDb);
                        await updatePublicDisplay(); await updateAdminPanel();
                        collected.first().delete().catch(()=>{});
                    }
                }

                // 3. Sửa Banner
                if (i.customId === 'admin_edit_img') {
                    await i.reply({ content: '🖼️ Gửi link Banner mới:', flags: [64] });
                    const collected = await i.channel.awaitMessages({ filter, max: 1, time: 30000 });
                    if (collected.first()) {
                        currentDb.currentImg = collected.first().content.trim();
                        saveData(currentDb);
                        await updatePublicDisplay(); await updateAdminPanel();
                        collected.first().delete().catch(()=>{});
                    }
                }

                // 4. Thêm SP
                if (i.customId === 'admin_add_item') {
                    await i.reply({ content: '1️⃣ Tên SP:', flags: [64] });
                    const nMsg = await i.channel.awaitMessages({ filter, max: 1, time: 30000 });
                    if (nMsg.first()) {
                        const name = nMsg.first().content; nMsg.first().delete().catch(()=>{});
                        await i.followUp({ content: '2️⃣ Nội dung chi tiết:', flags: [64] });
                        const dMsg = await i.channel.awaitMessages({ filter, max: 1, time: 60000 });
                        if (dMsg.first()) {
                            currentDb.products.push({ name, detail: dMsg.first().content, emoji: '💎' });
                            saveData(currentDb);
                            await updatePublicDisplay(); await updateAdminPanel();
                            dMsg.first().delete().catch(()=>{});
                        }
                    }
                }

                // 5. Sửa SP (Mới update)
                if (i.customId === 'admin_edit_item') {
                    if (currentDb.products.length === 0) return i.reply({ content: 'Trống!', flags: [64] });
                    const list = currentDb.products.map((p, idx) => `**${idx + 1}.** ${p.name}`).join('\n');
                    await i.reply({ content: `📝 Nhập số thứ tự muốn sửa nội dung:\n${list}`, flags: [64] });
                    const idxCol = await i.channel.awaitMessages({ filter, max: 1, time: 30000 });
                    if (idxCol.first()) {
                        const idx = parseInt(idxCol.first().content) - 1; idxCol.first().delete().catch(()=>{});
                        if (idx >= 0 && idx < currentDb.products.length) {
                            await i.followUp({ content: `📌 Nhập nội dung chi tiết mới cho **${currentDb.products[idx].name}**:`, flags: [64] });
                            const detailCol = await i.channel.awaitMessages({ filter, max: 1, time: 60000 });
                            if (detailCol.first()) {
                                currentDb.products[idx].detail = detailCol.first().content;
                                saveData(currentDb);
                                await updatePublicDisplay();
                                detailCol.first().delete().catch(()=>{});
                            }
                        }
                    }
                }

                // 6. Xóa SP
                if (i.customId === 'admin_del_item') {
                    if (currentDb.products.length === 0) return i.reply({ content: 'Trống!', flags: [64] });
                    const list = currentDb.products.map((p, idx) => `**${idx + 1}.** ${p.name}`).join('\n');
                    await i.reply({ content: `🗑️ Nhập số thứ tự muốn xóa:\n${list}`, flags: [64] });
                    const rMsg = await i.channel.awaitMessages({ filter, max: 1, time: 30000 });
                    if (rMsg.first()) {
                        const n = parseInt(rMsg.first().content) - 1;
                        if (n >= 0 && n < currentDb.products.length) {
                            currentDb.products.splice(n, 1);
                            saveData(currentDb);
                            await updatePublicDisplay(); await updateAdminPanel();
                            rMsg.first().delete().catch(()=>{});
                        }
                    }
                }
            });
            global.marketplaceInitialized = true;
        }
    },
};