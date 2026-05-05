const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check_bill')
        .setDescription('Kiểm tra thông tin mã giao dịch')
        // LỚP BẢO MẬT 1: Chỉ Admin mới thấy lệnh trong menu /
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('ma_gd').setDescription('Mã cần check (VD: SERENPAY#1)').setRequired(true)),
    
    async execute(interaction) {
        // LỚP BẢO MẬT 2: Kiểm tra thủ công ID Trần Đăng Hiển và các Role Quản trị
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

        // --- LOGIC KIỂM TRA BILL ---
        const ordersPath = path.join(__dirname, '../data/orders.json');
        
        if (!fs.existsSync(ordersPath)) {
            return interaction.reply({ content: '❌ Chưa có dữ liệu đơn hàng nào được tạo.', flags: [64] });
        }

        const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
        const maGd = interaction.options.getString('ma_gd');
        const order = orders[maGd];

        if (!order) {
            return interaction.reply({ content: `❌ Mã giao dịch \`${maGd}\` không tồn tại hoặc đã được xử lý.`, flags: [64] });
        }

        const embed = new EmbedBuilder()
            .setTitle('🔍 CHI TIẾT ĐƠN HÀNG')
            .addFields(
                { name: '👤 Khách hàng', value: `<@${order.userId}> (\`${order.userId}\`)`, inline: false },
                { name: '🛒 Sản phẩm mua', value: `**${order.productName}**`, inline: true },
                { name: '⏰ Thời gian tạo', value: `\`${order.time}\``, inline: true }
            )
            .setColor('#3498db')
            .setFooter({ text: 'Serendipity Automation System — Quản trị bởi Trần Đăng Hiển' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: [64] });
    }
};