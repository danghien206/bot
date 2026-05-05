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
        .setName('autoreply_admin')
        .setDescription('Quản lý phản hồi tin nhắn tự động')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const configPath = path.join(__dirname, '../data/autoreply_config.json');
        
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({ trigger: "hello", response: "Xin chào bạn!" }, null, 2));
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        const embed = new EmbedBuilder()
            .setTitle('💬 CẤU HÌNH PHẢN HỒI TỰ ĐỘNG')
            .setColor('#3498db')
            .addFields(
                { name: 'Từ khóa (Trigger)', value: `\`${config.trigger}\``, inline: true },
                { name: 'Phản hồi (Response)', value: `\`${config.response}\``, inline: true }
            )
            .setFooter({ text: 'Dev by dh' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_edit_autoreply')
                .setLabel('Chỉnh sửa thiết lập')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};