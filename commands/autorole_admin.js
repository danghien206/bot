const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole_admin')
        .setDescription('Panel thiết lập tự động cấp Role khi thành viên tham gia')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // LỖI Ở ĐÂY: Phải có chữ async trước (interaction)
    async execute(interaction) { 
        const configPath = path.join(__dirname, '../data/autorole_config.json');
        
        // Khởi tạo file nếu chưa có
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({ enabled: false, roleId: null }, null, 2));
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        const embed = new EmbedBuilder()
            .setTitle('⚙️ CẤU HÌNH AUTO ROLE')
            .setColor(config.enabled ? '#2ecc71' : '#e74c3c')
            .setDescription(
                `Trạng thái: **${config.enabled ? 'ĐANG BẬT ✅' : 'ĐANG TẮT ❌'}**\n` +
                `Role sẽ cấp: ${config.roleId ? `<@&${config.roleId}>` : '`Chưa thiết lập`'}`
            )
            .setFooter({ text: 'SerenPay System — Quản lý bởi Trần Đăng Hiển' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ar_toggle')
                .setLabel(config.enabled ? 'Tắt Auto Role' : 'Bật Auto Role')
                .setStyle(config.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ar_set_role')
                .setLabel('Thiết lập ID Role')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};