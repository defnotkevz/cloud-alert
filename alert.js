const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Function to send an email
async function sendEmail(subject, text) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });

    let info = await transporter.sendMail({
        from: `"Website Watcher" <${process.env.EMAIL}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: subject,
        text: text,
    });

    console.log("Email sent: %s", info.messageId);
}

// Function to check product page using Cheerio
async function checkForNewProducts() {
    console.log('running')
    const url = 'https://gameloot.in/product-category/virtual-reality/';
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        // Extract product data
        const products = [];
        $('.products > .kad_product').each((i, el) => {
            const $el = $(el);
            const product = {
                id: $el.find('.grid_item').attr('data-product-id') || '', // Assuming there's no ID in the HTML, leaving a placeholder
                name: $el.find('.product_details h5').text().trim(),  // Corrected class to target the product name
                price: $el.find('.product_price ins .woocommerce-Price-amount').text().trim(), // Extract the price after discount
                url: $el.find('a.product_item_link').attr('href')  // Corrected the selector for the product URL
            };
            products.push(product);
        });

        // Check if new products have been added
        const newProducts = getNewProducts(products);
        if (newProducts.length > 0) {
            // Format the new products into a string to send in the email
            const productListText = newProducts.map(product => 
                `Product: ${product.name}\nPrice: ${product.price}\nURL: ${product.url}\n`
            ).join('\n');

            // Send email with new products
            await sendEmail('New Product Alert - Gameloot', `New Products:\n\n${productListText}`);
        }
    } catch (error) {
        console.error("Error fetching product data:", error);
    }
}

// Keep track of previously seen products
let previousProductList = [];

// Function to get new products
function getNewProducts(currentProductList) {
    if (previousProductList.length === 0) {
        previousProductList = [...currentProductList];
        return [];
    }

    const newProducts = currentProductList.filter(product => !previousProductList.some(p => p.id === product.id));
    previousProductList = [...currentProductList];

    return newProducts;
}

// Check for new products every 60 seconds
setInterval(checkForNewProducts, 60000); // Check every 60 seconds
