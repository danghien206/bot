const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ten_lenh')
        .setDescription('Mo ta lenh')
        // LỚP BẢO MẬT 1: Chặn ở cấp độ Discord
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // LỚP BẢO MẬT 2: Kiểm tra thủ công ID và Role
        const config = {
            ownerId: '1114889680484315206', // ID Trần Đăng Hiển
            adminRoles: ['1500501084429484288', '1500501084429484289']
        };

        const hasAuth = interaction.user.id === config.ownerId || 
                        interaction.member.roles.cache.some(r => config.adminRoles.includes(r.id));

        if (!hasAuth) {
            return interaction.reply({ 
                content: '❌ Lệnh này chỉ dành cho Quản trị viên hệ thống!', 
                flags: [64] 
            });
        }

        // Logic code của bạn sẽ nằm dưới đây...
    },
};
module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto')
        .setDescription('Quản lý hệ thống bán hàng')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Thêm món hàng mới')
                .addStringOption(opt => opt.setName('tên').setDescription('Tên món hàng').setRequired(true))
                .addIntegerOption(opt => opt.setName('giá').setDescription('Số tiền (VNĐ)').setRequired(true))
                .addStringOption(opt => opt.setName('hình_ảnh').setDescription('Link icon sản phẩm (URL)').setRequired(true))
        ),
    async execute(interaction) {
        const dbPath = path.join(__dirname, '../data/database.json');
        const db = JSON.parse(fs.readFileSync(dbPath));

        if (interaction.options.getSubcommand() === 'add') {
            const name = interaction.options.getString('tên');
            const price = interaction.options.getInteger('giá');
            const image = interaction.options.getString('hình_ảnh');

            if (db.products.find(p => p.name === name)) {
                return interaction.reply('❌ Món hàng này đã tồn tại!');
            }

            db.products.push({ name, price, image });
            db.stock[name] = [];

            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
            await interaction.reply(`✅ Đã thêm: **${name}** | Giá: **${price.toLocaleString()} VNĐ**`);
        }
    },
};
