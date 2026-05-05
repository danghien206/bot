const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addproduct')
        .setDescription('Tạo một loại mặt hàng mới')
        // BẢO MẬT 1: Chặn ở cấp độ Discord (Chỉ Admin thấy lệnh)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt => opt.setName('name').setDescription('Tên sản phẩm').setRequired(true))
        .addIntegerOption(opt => opt.setName('price').setDescription('Giá tiền (VNĐ)').setRequired(true)),

    async execute(interaction) {
        // BẢO MẬT 2: Kiểm tra ID của Trần Đăng Hiển và các Role Admin
        const config = {
            ownerId: '1114889680484315206', // ID Trần Đăng Hiển
            adminRoles: ['1500501084429484288', '1500501084429484289']
        };

        const hasAuth = interaction.user.id === config.ownerId || 
                        interaction.member.roles.cache.some(r => config.adminRoles.includes(r.id));

        if (!hasAuth) {
            return interaction.reply({ 
                content: '❌ Lệnh này chỉ dành riêng cho Quản trị viên hệ thống!', 
                flags: [64] 
            });
        }

        // --- LOGIC XỬ LÝ SẢN PHẨM ---
        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');
        
        // Đảm bảo đường dẫn file chính xác
        const dbPath = path.join(__dirname, '../data/database.json');

        // Kiểm tra nếu file chưa tồn tại thì tạo mới cấu trúc cơ bản
        if (!fs.existsSync(dbPath)) {
            const initialDb = { products: [], stock: {} };
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
            fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2));
        }

        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // Kiểm tra trùng tên sản phẩm
        if (db.products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
            return interaction.reply({ content: '❌ Sản phẩm này đã tồn tại!', flags: [64] });
        }

        // Thêm sản phẩm mới vào database
        db.products.push({ name, price });
        
        // Khởi tạo kho trống cho sản phẩm này nếu chưa có
        if (!db.stock) db.stock = {};
        db.stock[name] = []; 

        // Lưu lại vào file
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        
        await interaction.reply({ 
            content: `✅ Đã tạo sản phẩm: **${name.toUpperCase()}**\n💵 Giá: \`${price.toLocaleString()}\` VNĐ\n📂 Hệ thống đã sẵn sàng nhận dữ liệu kho.`,
            flags: [64] // Chỉ admin thấy phản hồi này để giữ kín kênh
        });
    },
};