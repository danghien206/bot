const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách lệnh hệ thống'),
    async execute(interaction) {
        const dbPath = path.join(__dirname, '../data/help_commands.json');
        const commands = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        
        const embed = new EmbedBuilder()
            .setTitle('📚 DANH SÁCH LỆNH SERENPAY')
            .setColor('#5865F2')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({ text: 'Engineered by Trần Đăng Hiển' });

        if (commands.length === 0) {
            embed.setDescription('Chưa có lệnh nào. Nhấn nút bên dưới để thêm!');
        } else {
            commands.forEach(cmd => {
                embed.addFields({ 
                    name: `🔹 ${cmd.name}`, 
                    value: `> ${cmd.desc}\n> Cách dùng: \`${cmd.usage}\``, 
                    inline: false 
                });
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('help_add_cmd')
                .setLabel('➕ Thêm Lệnh')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};