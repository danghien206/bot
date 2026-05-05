const { 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
    ButtonStyle, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, 
    StringSelectMenuBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/react_role_config.json');

// --- HÀM HELPER ---
function loadData() {
    const def = {
        targetChannelId: null,
        panelMsgId: null,
        roles: [], 
        embed: {
            title: "🎭 CHỌN ROLE TỰ ĐỘNG",
            description: "Nhấn vào reaction tương ứng để nhận role.",
            color: "#ffffff"
        }
    };
    try {
        if (!fs.existsSync(dbPath)) {
            if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
            fs.writeFileSync(dbPath, JSON.stringify(def, null, 4));
            return def;
        }
        return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch (e) { return def; }
}

const saveData = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

const renderAdminEmbed = (db) => {
    return new EmbedBuilder()
        .setTitle("🛠️ REACTION ROLE ADMIN")
        .setDescription("Cấu hình bảng chọn Role tự động bằng cách nhấn icon.")
        .addFields(
            { name: "📍 Kênh đích", value: db.targetChannelId ? `<#${db.targetChannelId}>` : "`Chưa đặt`", inline: true },
            { name: "📊 Số lượng", value: `\`${db.roles.length}/20\``, inline: true },
            { name: "📋 Danh sách hiện tại", value: db.roles.map((r, i) => `**${i+1}.** ${r.emoji} -> <@&${r.roleId}>`).join('\n') || "_Trống_" }
        )
        .setColor("#2b2d31")
        .setFooter({ text: "SerenPay System — Engineered by Trần Đăng Hiển" });
};

// Menu quản lý
const getAdminRows = (db) => [
    new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rr_cfg_ch').setLabel('Đặt Kênh').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rr_add_role').setLabel('Thêm Role').setStyle(ButtonStyle.Success).setDisabled(db.roles.length >= 20),
        new ButtonBuilder().setCustomId('rr_remove_menu').setLabel('Xóa Role').setStyle(ButtonStyle.Secondary).setDisabled(db.roles.length === 0),
    ),
    new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rr_edit_msg').setLabel('Sửa Giao Diện').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rr_clear').setLabel('Xoá Hết').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('rr_publish').setLabel('🚀 XUẤT BẢN').setStyle(ButtonStyle.Danger).setDisabled(!db.targetChannelId || db.roles.length === 0)
    )
];

const ownerId = '1114889680484315206';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rr_admin')
        .setDescription('Quản lý hệ thống chọn Role')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== ownerId) return interaction.reply({ content: '❌ Bạn không phải chủ sở hữu hệ thống!', ephemeral: true });
        const db = loadData();
        await interaction.reply({ embeds: [renderAdminEmbed(db)], components: getAdminRows(db), ephemeral: true });
    },

    async handleInteraction(i) {
        let db = loadData();
        if (i.user.id !== ownerId) return;

        // --- XỬ LÝ NÚT BẤM ---
        if (i.isButton()) {
            if (i.customId === 'rr_cfg_ch') {
                const m = new ModalBuilder().setCustomId('m_rr_ch').setTitle('Cấu hình kênh');
                m.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('in_ch').setLabel("Dán ID Kênh vào đây").setValue(db.targetChannelId || "").setRequired(true).setStyle(TextInputStyle.Short)
                ));
                return await i.showModal(m);
            }

            if (i.customId === 'rr_add_role') {
                const m = new ModalBuilder().setCustomId('m_rr_add').setTitle('Thêm Role mới');
                m.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_emoji').setLabel("Emoji (Icon)").setPlaceholder("VD: ✅ hoặc <:ten:id>").setRequired(true).setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_roleid').setLabel("Role ID").setRequired(true).setStyle(TextInputStyle.Short))
                );
                return await i.showModal(m);
            }

            if (i.customId === 'rr_remove_menu') {
                const select = new StringSelectMenuBuilder()
                    .setCustomId('rr_delete_select')
                    .setPlaceholder('Chọn Role muốn xóa')
                    .addOptions(db.roles.map((r, index) => ({
                        label: `Xóa Role thứ ${index + 1}`,
                        description: `ID: ${r.roleId}`,
                        emoji: r.emoji,
                        value: index.toString()
                    })));
                return await i.update({ components: [new ActionRowBuilder().addComponents(select)] });
            }

            if (i.customId === 'rr_edit_msg') {
                const m = new ModalBuilder().setCustomId('m_rr_msg').setTitle('Sửa nội dung Panel');
                m.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_title').setLabel("Tiêu đề").setValue(db.embed.title).setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_desc').setLabel("Mô tả (Dùng \\n để xuống dòng)").setValue(db.embed.description).setStyle(TextInputStyle.Paragraph)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('in_color').setLabel("Màu Hex").setValue(db.embed.color).setPlaceholder("#FFFFFF").setStyle(TextInputStyle.Short))
                );
                return await i.showModal(m);
            }

            if (i.customId === 'rr_clear') {
                db.roles = [];
                saveData(db);
                return await i.update({ embeds: [renderAdminEmbed(db)], components: getAdminRows(db) });
            }

            if (i.customId === 'rr_publish') {
                await i.deferUpdate();
                const channel = i.client.channels.cache.get(db.targetChannelId);
                if (!channel) return i.followUp({ content: "❌ Kênh không tồn tại!", ephemeral: true });

                try {
                    const userEmbed = new EmbedBuilder()
                        .setTitle(db.embed.title)
                        .setDescription(db.embed.description + "\n\n" + db.roles.map(r => `${r.emoji} : <@&${r.roleId}>`).join('\n'))
                        .setColor(db.embed.color.startsWith('#') ? db.embed.color : "#ffffff");

                    const msg = await channel.send({ embeds: [userEmbed] });
                    for (const r of db.roles) {
                        // Xử lý cả emoji thường và custom emoji ID
                        const emojiMatch = r.emoji.match(/<a?:\w+:(\d+)>/);
                        const reactionEmoji = emojiMatch ? emojiMatch[1] : r.emoji;
                        await msg.react(reactionEmoji).catch(() => {});
                    }

                    db.panelMsgId = msg.id;
                    saveData(db);
                    return i.followUp({ content: "✅ Panel đã được gửi thành công!", ephemeral: true });
                } catch (e) {
                    return i.followUp({ content: `❌ Lỗi: ${e.message}`, ephemeral: true });
                }
            }
        }

        // --- XỬ LÝ SELECT MENU ---
        if (i.isStringSelectMenu() && i.customId === 'rr_delete_select') {
            const index = parseInt(i.values[0]);
            db.roles.splice(index, 1);
            saveData(db);
            return await i.update({ embeds: [renderAdminEmbed(db)], components: getAdminRows(db) });
        }

        // --- XỬ LÝ MODAL ---
        if (i.isModalSubmit()) {
            if (i.customId === 'm_rr_ch') {
                db.targetChannelId = i.fields.getTextInputValue('in_ch');
            } else if (i.customId === 'm_rr_add') {
                const emoji = i.fields.getTextInputValue('in_emoji');
                const roleId = i.fields.getTextInputValue('in_roleid');
                
                // Kiểm tra role có tồn tại trong server không
                const role = i.guild.roles.cache.get(roleId);
                if (!role) return i.reply({ content: "❌ ID Role không hợp lệ!", ephemeral: true });

                db.roles.push({ emoji, roleId });
            } else if (i.customId === 'm_rr_msg') {
                db.embed.title = i.fields.getTextInputValue('in_title');
                db.embed.description = i.fields.getTextInputValue('in_desc');
                db.embed.color = i.fields.getTextInputValue('in_color');
            }
            saveData(db);
            return await i.update({ embeds: [renderAdminEmbed(db)], components: getAdminRows(db) });
        }
    }
};