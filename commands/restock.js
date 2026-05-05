const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restock')
        .setDescription('Nạp thêm tài khoản vào kho')
        // LỚP BẢO MẬT 1: Chặn ở cấp độ Discord (Chỉ Admin mới thấy lệnh)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('name').setDescription('Tên sản phẩm').setRequired(true))
        .addStringOption(opt => opt.setName('data').setDescription('Dán danh sách (xuống dòng, dấu phẩy hoặc dấu |)').setRequired(true)),

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
                content: '❌ Lệnh này chỉ dành cho admin!', 
                flags: [64] 
            });
        }

        // --- LOGIC NẠP HÀNG ---
        const name = interaction.options.getString('name');
        const rawData = interaction.options.getString('data');

        const dbPath = path.join(__dirname, '../data/database.json');
        
        // Kiểm tra file tồn tại trước khi đọc
        if (!fs.existsSync(dbPath)) {
            return interaction.reply({ content: '❌ File dữ liệu không tồn tại. Hãy tạo sản phẩm trước!', flags: [64] });
        }

        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // Kiểm tra xem sản phẩm có trong kho không
        if (!db.stock || !db.stock[name]) {
            return interaction.reply({ content: '❌ Không tìm thấy sản phẩm này trong kho!', flags: [64] });
        }

        // Tách dữ liệu thông minh
        const itemsToAdd = rawData
            .split(/[\n\r,|]+/) 
            .map(item => item.trim())
            .filter(item => item.length > 0);

        if (itemsToAdd.length === 0) {
            return interaction.reply({ content: '❌ Dữ liệu nạp vào không hợp lệ!', flags: [64] });
        }

        // Nạp vào và lưu lại
        db.stock[name].push(...itemsToAdd);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        await interaction.reply({ 
            content: `✅ **Nạp hàng thành công cho ${name.toUpperCase()}!**\n- Bot đã đếm được: **${itemsToAdd.length}** mặt hàng.\n- Tổng kho hiện tại: **${db.stock[name].length}** cái.`,
            flags: [64] 
        });
    },
};