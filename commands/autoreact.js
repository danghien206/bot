const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoreact')
        .setDescription('Cấu hình tự động react tin nhắn')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Thêm từ khóa và emoji')
                .addStringOption(opt => opt.setName('keyword').setDescription('Từ khóa kích hoạt').setRequired(true))
                .addStringOption(opt => opt.setName('emojis').setDescription('Các emoji (cách nhau bởi dấu phẩy)').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Xem danh sách từ khóa hiện có')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Xóa một từ khóa')
                .addStringOption(opt => opt.setName('keyword').setDescription('Từ khóa cần xóa').setRequired(true))
        ),

    async execute(interaction) {
        const path = './data/autoreact_config.json';
        let data = JSON.parse(fs.readFileSync(path, 'utf8'));

        if (interaction.options.getSubcommand() === 'add') {
            const keyword = interaction.options.getString('keyword').toLowerCase();
            const emojis = interaction.options.getString('emojis').split(',').map(e => e.trim());

            const index = data.findIndex(i => i.trigger === keyword);
            if (index !== -1) {
                data[index].emojis = emojis;
            } else {
                data.push({ trigger: keyword, emojis: emojis });
            }

            fs.writeFileSync(path, JSON.stringify(data, null, 2));
            return interaction.reply({ content: `✅ Đã thêm/cập nhật từ khóa \`${keyword}\` với các emoji: ${emojis.join(' ')}`, ephemeral: true });
        }

        if (interaction.options.getSubcommand() === 'list') {
            if (data.length === 0) return interaction.reply({ content: 'Chưa có từ khóa nào.', ephemeral: true });
            const list = data.map(i => `• **${i.trigger}**: ${i.emojis.join(' ')}`).join('\n');
            return interaction.reply({ content: `📊 **DANH SÁCH AUTO REACT:**\n${list}`, ephemeral: true });
        }

        if (interaction.options.getSubcommand() === 'remove') {
            const keyword = interaction.options.getString('keyword').toLowerCase();
            data = data.filter(i => i.trigger !== keyword);
            fs.writeFileSync(path, JSON.stringify(data, null, 2));
            return interaction.reply({ content: `✅ Đã xóa từ khóa \`${keyword}\``, ephemeral: true });
        }
    },
};