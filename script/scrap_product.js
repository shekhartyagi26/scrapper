const puppeteer = require('puppeteer');
var cheerio = require('cheerio');
const mongoose = require("mongoose");

const fetchProduct = ({ url: href }) => new Promise(async (resolve, reject) => {
    console.log("---------------- Url is processing  :: " + href);

    try {
        if (!pagesToScrape) {
            var pagesToScrape = 1;
        }
        const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome' });
        const page = await browser.newPage();
        var urls = [];
        await page.goto(href, { waitUntil: 'load', timeout: 0 });
        await page.waitFor(5000);
        let currentPage = 1;

        while (currentPage <= pagesToScrape) {
            const scrap = () => new Promise(async (resolve, reject) => {
                const content = await page.content();
                const $ = cheerio.load(content);
                const srct = $('.results-wrapped > div > div > div');
                srct.each(function(i, element) {
                    const rank = $(this).find('a').attr('href');
                    const rank1 = $(this).find('a  img').attr('src');
                    const rank2 = $(this).find('.product-pod--padding > div > a > div > h2 > span').text() || $(this).find(' div > div > a').text();
                    const rank3a = $(this).find('#standard-price > div > div > span:nth-child(1)').text() || $(this).find('#was-price > div > div > span:nth-child(3)').text();
                    const rank3 = $(this).find('#standard-price > div > div > span:nth-child(2)').text() || $(this).find('#was-price > div > div > span:nth-child(2)').text() || ($(this).find('#range-price > div:nth-child(1) > div:nth-child(1) > div > span:nth-child(2)').text()).concat('-').concat($(this).find('#range-price > div:nth-child(1) > div:nth-child(3) > div > span:nth-child(2)').text());
                    const rank5 = $(this).find('#standard-price > div > div > span:nth-child(3)').text();
                    const rank4 = $(this).find('.product-pod--padding > div > a > div > span').text();
                    const rank7 = $(this).find('.product-pod--padding > div.product-pod__title > p > span').text();
                    rank6 = rank3a.concat(rank3).concat('.').concat(rank5);
                    urls.push({
                        srno: i,
                        descrip: rank2,
                        href: rank,
                        src: rank1,
                        price: rank6,
                        rating: rank4,
                        brand: rank7
                    });
                });
                resolve();
            });

            await scrap();

            var pageScrap = [];
            var sdtc = await page.$$('nav.hd-pagination > ul > li');
            for (const sdt of sdtc) {
                const $value = await sdt.$eval('button,span', button => button.innerText);
                if (isNaN($value)) {
                    pageScrap.push(1);
                } else { pageScrap.push($value); }
            };
            if (pageScrap.length == 0) {
                resolve();
            }
            var max = pageScrap.reduce(function(a, b) {
                return Math.max(a, b)
            });
            console.log("page scrapped:" + currentPage + "/" + max);
            if (currentPage < max) {
                await Promise.all([await page.waitForSelector('nav.hd-pagination > ul > li:last-child > button', { waitUntil: 'load' }),
                    await page.click("nav.hd-pagination > ul > li:last-child > button"),
                    await page.waitFor(10000),
                    pagesToScrape++,
                ]);
            } else {
                console.dir(urls, { 'maxArrayLength': null })
                console.log(urls.length);
            }
            currentPage++;
        }
        await browser.close();
        resolve(urls)
    } catch (err) {
        reject(err);
    }
});



const createConnection = () => new Promise((resolve, reject) => {
    let dbUrl = 'mongodb://127.0.0.1/estimater';
    var conn_pg_catalog_product = mongoose.createConnection(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    var schema_catalog_product = mongoose.Schema({}, {
        strict: false,
        collection: 'catalog_products'
    });
    var conn_catalog_product = conn_pg_catalog_product.model('catalog_products', schema_catalog_product);

    var schema_catalog_urls = mongoose.Schema({}, {
        strict: false,
        collection: 'catalog_urls'
    });
    var conn_catalog_urls = conn_pg_catalog_product.model('catalog_urls', schema_catalog_urls);

    resolve({ conn_catalog_product, conn_catalog_urls });
})

const callFetchProduct = (catalog_url_data, website) => new Promise(async (resolve, reject) => {

    console.log("\n");
    console.log('Waiting Time : 1 Seconds....................');
    console.log("\n");
    console.log("---------------------------------------------------------------------Total Urls Pending To Check  :: " + catalog_url_data.length);

    var pendingUrls = catalog_url_data;
    var currentUrl = pendingUrls.splice(-1);
    try {
        await fetchProduct(currentUrl[0])
        if (pendingUrls.length > 0) {
            callFetchProduct(pendingUrls, website);
        } else {
            start(website);
        }
    } catch (err) {
        console.log("something went wrong", err)
        process.exit(0);
    }
})


const start = (website) => new Promise(async (resolve, reject) => {
    const { conn_catalog_product, conn_catalog_urls } = await createConnection();
    console.log("---------------------------------------------------------------------Start Checking For Catalog Urls");

    let catalog_url_data = await conn_catalog_urls.find({ website }, {}, { lean: true });
    console.log("---------------------------------------------------------------------Start :: Total Urls Found  :: " + catalog_url_data.length);

    if (catalog_url_data.length > 0) {
        callFetchProduct(catalog_url_data, website)
    } else {
        console.log(`No catalog url found for ${website}`)
    }
});



//*******************************************************************************************************
var master_website_list = ['homedepot'];
var MASTER_WEBSITE = false;
var args = process.argv.slice(2);
if (args.length == 0) {
    console.log('Please pass a master website to start. So DIE!!!');
    process.exit(0);
} else {
    arg_website = args[0];
    if (master_website_list.includes(arg_website)) {

        MASTER_WEBSITE = arg_website;
        start(MASTER_WEBSITE);
        //console.log( arg_website + " :: is a valid master website" );
    } else {
        console.log(arg_website + " :: is not a valid master website. So DIE!!!");
        process.exit(0);
    }
}
console.log('Master Website :: ' + MASTER_WEBSITE);
//*******************************************************************************************************