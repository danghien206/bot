const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Hiển thị bảng mua hàng Serendipity (Tự động cập nhật)')
        // Chỉ Admin mới có thể thấy và sử dụng lệnh này trên Discord
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Cấu hình quyền hạn (Dữ liệu từ User Summary)
        const config = {
            ownerId: '1114889680484315206', // Trần Đăng Hiển
            adminRole: '1500501084429484288',
            ownerRole: '1500501084429484289'
        };

        // Kiểm tra quyền thủ công
        const hasAuth = interaction.member.id === config.ownerId || 
                       interaction.member.roles.cache.has(config.adminRole) || 
                       interaction.member.roles.cache.has(config.ownerRole);

        if (!hasAuth) {
            return interaction.reply({ 
                content: '❌ Chỉ có **Trần Đăng Hiển** hoặc Quản trị viên mới có quyền thực hiện lệnh này!', 
                ephemeral: true 
            });
        }

        const dbPath = path.join(__dirname, '../data/database.json');
        
        if (!fs.existsSync(dbPath)) {
            return interaction.reply({ 
                content: '❌ Không tìm thấy database.json. Vui lòng kiểm tra lại thư mục data!', 
                ephemeral: true 
            });
        }

        // Đọc dữ liệu database (Sử dụng tên biến duy nhất để tránh lỗi SyntaxError)
        let shopData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        
        if (!shopData.products || shopData.products.length === 0) {
            return interaction.reply({ content: '❌ Hiện chưa có sản phẩm nào trong kho!', ephemeral: true });
        }

        const selectOptions = [];
        let statusText = "";

        // Lấy tối đa 25 sản phẩm để hiển thị
        const productsToShow = shopData.products.slice(0, 25);

        productsToShow.forEach(p => {
            const stockCount = (shopData.stock && shopData.stock[p.name]) ? shopData.stock[p.name].length : 0;
            const emoji = p.emoji || '🔹';
            
            statusText += `${emoji} **${p.name.toUpperCase()}**\n`;
            statusText += `└ 💵 Giá: \`${p.price ? p.price.toLocaleString() : 'Liên hệ'}\` VNĐ — 📦 Kho: \`${stockCount}\` \n\n`;

            selectOptions.push({
                label: p.name.toUpperCase(),
                description: `Giá: ${p.price ? p.price.toLocaleString() : '??'} VNĐ | Kho: ${stockCount}`,
                value: `buy_${p.name}`,
                emoji: emoji 
            });
        });

        const embed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('💎 SERENDIPITY AUTO-BUY SYSTEM')
            .setDescription(
                'Chào mừng bạn đến với hệ thống mua hàng tự động.\n' +
                'Vui lòng chọn sản phẩm ở menu bên dưới để tiến hành thanh toán.\n\n' +
                '**📊 TÌNH TRẠNG KHO HÀNG**\n' +
                '──────────────────────────\n' +
                statusText +
                '──────────────────────────'
            )
            .setImage(shopData.currentImg || 'https://i.ibb.co/mCT7pwYM/Serendipity-Auto-Buy-text-on-simple-black-background-1.jpg')
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setFooter({ 
                text: 'Hệ thống vận hành bởi Serendipity Store — Engineered by Trần Đăng Hiển', 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_product')
                .setPlaceholder('Chọn một món hàng để mua...')
                .addOptions(selectOptions)
        );

        // Gửi tin nhắn bảng hàng
        const response = await interaction.reply({ 
            embeds: [embed], 
            components: [row], 
            fetchReply: true 
        });

        // LƯU LẠI THÔNG TIN ĐỂ TỰ CẬP NHẬT THEO THỜI GIAN THỰC
        // Khi bạn thêm hàng bằng lệnh khác, bot sẽ dùng 2 ID này để tìm và sửa tin nhắn này
        shopData.setupMessageId = response.id; 
        shopData.setupChannelId = interaction.channelId; 
        
        fs.writeFileSync(dbPath, JSON.stringify(shopData, null, 2));
    },
};