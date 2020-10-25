const puppeteer = require('puppeteer');
var cheerio = require('cheerio');
const mongoose = require("mongoose");


const insertProduct = (products, conn_catalog_product, conn_catalog_urls) => new Promise((resolve, reject) => {
    console.log("------------------------ Insert products in the db -------------------------------");
    try {
        console.log(`-------------------------------Total products found ${products.length} -------------------------------`);
        products.map(async (product) => {
            if (product.productId) {
                let record = await conn_catalog_product.findOne({ productId: product.productId });
                if (!record) await conn_catalog_product.create(product)
                return;
            } else return;
        })
        resolve();
    } catch (err) {
        console.log(err)
        resolve(err);

    }
    console.log("------------------------ products inserted succesfully -------------------------------");
});

const scrapFergusonProduct = ({ url: href }, website, conn_catalog_product, conn_catalog_urls) => new Promise(async (resolve, reject) => {
    console.log("---------------------------------------------------------------------STEP :: Analysing Catalog Url  :: " + href);
    try {
        if (!pagesToScrape) {
            var pagesToScrape = 1;
        }
        const browser = await puppeteer.launch({  ignoreDefaultArgs: ['--disable-extensions'], executablePath: '/usr/bin/google-chrome-stable' /*headless: false*/ });
        const page = await browser.newPage();
        var products = [];
        await page.goto(href, { waitUntil: 'load', timeout: 0, visible: true });
        await page.waitForTimeout(5000);
        let currentPage = 1;

        console.log("---------------------------------------------------------------------STEP :: Analysing Catalog Url Response");
        await Promise.all([
            await page.waitForSelector('div.select > span > span > select', { waitUntil: 'load' }),
            await page.click(' div.select > span > span > select'),
            await page.waitForTimeout(1000),
            await page.hover('div.select > span > span > div > div.sim-list > div > ul > div > li:last-child'),
            await page.click('div.select > span > span > div > div.sim-list > div > ul > div > li:last-child'),
            await page.waitForTimeout(10000)
        ]);
        while (currentPage <= pagesToScrape) {
            var results = [];
            const url = await scrap();

            function scrap() {
                var promise = new Promise(async (resolve, reject) => {
                    const content = await page.content()
                    const $ = cheerio.load(content)
                    pagesToScrape = $("#wrapper > main > div > div > div > div> div > div > div > div.rc-fg-page-select>span.pages").text().slice(-3).trim();
                    if (pagesToScrape) {
                        const srct = $("#wrapper > main> div > div > div > div> div >div.fg-search-results-box> ul>li>div");
                        srct.each(function(i, element) {
                            const rank = $(this).find('a').attr('href');
                            const rank1 = $(this).find('a  img').attr('src');
                            const rank2 = $(this).find('div.sr-content-box > a > p').text();
                            const rank3 = $(this).find('div>div.money>p>span').text().replace(/\s+/, "").replace(/\n/g, "").trim();
                            const rank4 = $(this).find('.product-pod--padding > div > a > div > span').text() || $(this).find('div>a:nth-child(2)').text();
                            const rank7 = $(this).find('.product-pod--padding > div.product-pod__title > p > span').text() || $(this).find('a > div > h2 > span:nth-child(1)').text() || $(this).find(' div> a> span.pod-plp__brand-name').text();
                            const productId = $(this).find('div.sr-content-box> p>a').text().replace("Part #:", "").trim();
                            results.push({
                                descrip: rank2,
                                href: rank,
                                src: rank1,
                                price: rank3,
                                rating: rank4,
                                brand: rank7,
                                productId
                            });
                        });
                    }
                    resolve(results);
                });
                return promise;
            };
            products = products.concat(url);
            console.log(products.length);

            console.log("page scrapped:" + currentPage + "/" + pagesToScrape);
            if (currentPage <= pagesToScrape) {
                await Promise.all([
                    await page.waitForSelector("#wrapper > main > div > div > div > div > div > div> div > div.rc-fg-page-select > a", { waitUntil: 'load' }),
                    await page.click("#wrapper > main > div > div > div > div > div > div> div > div.rc-fg-page-select > a:last-child"),
                    await page.waitForTimeout(10000),
                ]);
            } else {
                console.log(products.length);
            }
            currentPage++;
        }
        await browser.close();
        console.log("-------------", products.length)
        await insertProduct(products, conn_catalog_product, conn_catalog_urls);
        resolve()
    } catch (err) {
        console.log("---------------------------------------------------------------------ERROR OCCURS", err);
        scrapFergusonProduct({ url: href }, website, conn_catalog_product, conn_catalog_urls)
    }
})

const scrapHomeDepotProduct = ({ url: href }, website, conn_catalog_product, conn_catalog_urls) => new Promise(async (resolve, reject) => {
    console.log("---------------------------------------------------------------------STEP :: Analysing Catalog Url  :: " + href);
    try {
        if (!pagesToScrape) {
            var pagesToScrape = 1;
        }

        const browser = await puppeteer.launch({
            // headless: false,
            args: ["--no-sandbox"],
            executablePath: '/usr/bin/google-chrome-stable'
        });
        const page = await browser.newPage();
        var urls = [];
        await page.goto(href, { waitUntil: 'load', timeout: 0 });
        await page.waitForTimeout(5000);
        let currentPage = 1;
        console.log("---------------------------------------------------------------------STEP :: Analysing Catalog Url Response");

        while (currentPage <= pagesToScrape) {
            var results = [];
            const url = await scrap();

            function scrap() {
                var promise = new Promise(async (resolve, reject) => {
                    const content = await page.content();
                    const $ = cheerio.load(content);
                    if ($('#products').length != 0) {
                        const srct = $('#products > div > div > div');
                        srct.each(function(i, element) {
                            const rank = $(this).find('a').attr('href');
                            const rank1 = $(this).find('a  img').attr('src');
                            const rank2 = $(this).find('div.pod-plp__description.js-podclick-analytics  > a').clone().children().remove().end().text().replace(/\s+/, "").replace(/\t/g, "").replace(/\n/g, "").trim();
                            const rank3 = $(this).find(" .price__wrapper > div > div.if__overflow > div > div.price__numbers").clone().children().remove().end().text().replace(/\s+/, "").replace(/\n/g, "").trim();
                            const rank5 = $(this).find("div.price__wrapper > div > div.if__overflow> div > div.price__numbers > span:nth-child(2)").text();
                            const rank6 = ("$").concat(rank3).concat('.').concat(rank5);
                            const rank4 = $(this).find('.product-pod--padding > div > a > div > span').text() || $(this).find('div>a:nth-child(2)').text();
                            const rank7 = $(this).find('.product-pod--padding > div.product-pod__title > p > span').text() || $(this).find('a > div > h2 > span:nth-child(1)').text() || $(this).find(' div> a> span.pod-plp__brand-name').text();
                            const productId = $(this).find('meta[data-prop=productID]').attr("content");
                            results.push({
                                descrip: rank2,
                                href: rank,
                                src: rank1,
                                price: rank6,
                                rating: rank4,
                                brand: rank7,
                                productId
                            });
                        });
                    } else {
                        const srct = $('.results-wrapped > div > div > div');
                        srct.each(function(i, element) {
                            const rank = $(this).find('a').attr('href');
                            const rank1 = $(this).find('a  img').attr('src');
                            const rank2 = $(this).find('.product-pod--padding > div > a > div > h2 > span').text()
                            const rank3 = $(this).find('#standard-price > div > div > span:nth-child(2)').text() || $(this).find('.product-pod--padding > div.price__wrapper > div > div.price > div > span:nth-child(2)').text() || $(this).find('#was-price > div > div > span:nth-child(2)').text() || ($(this).find('#range-price > div:nth-child(1) > div:nth-child(1) > div > span:nth-child(2)').text()).concat('-').concat($(this).find('#range-price > div:nth-child(1) > div:nth-child(3) > div > span:nth-child(2)').text());
                            const rank5 = $(this).find('#standard-price > div > div > span:nth-child(3)').text() || $(this).find('.product-pod--padding > div.price__wrapper > div > div.price > div > span:nth-child(3)').text()
                            const rank6 = ("$").concat(rank3).concat('.').concat(rank5);
                            const rank4 = $(this).find('.product-pod--padding > div > a > div > span').text() || $(this).find('div>a:nth-child(2)').text();
                            const rank7 = $(this).find('.product-pod--padding > div.product-pod__title > p > span').text() || $(this).find('a > div > h2 > span:nth-child(1)').text() || $(this).find(' div> a> span.pod-plp__brand-name').text();
                            const productId = $(this).find('meta[data-prop=productID]').attr("content");
                            results.push({
                                descrip: rank2,
                                href: rank,
                                src: rank1,
                                price: rank6,
                                rating: rank4,
                                brand: rank7,
                                productId
                            });
                        });
                    }
                    console.log(results.length)
                    resolve(results);
                });
                return promise;
            };
            urls = urls.concat(url);
            var pageScrap = [];
            var sdtc = await page.$$('nav.hd-pagination > ul > li');
            for (const sdt of sdtc) {
                const $value = await sdt.$eval('button,span,a', button => button.innerText);
                if (isNaN($value)) {
                    pageScrap.push(1);
                } else { pageScrap.push($value); }
            };
            console.log(pageScrap.length);
            if (pageScrap.length != 0) {
                var max = pageScrap.reduce(function(a, b) {
                    return Math.max(a, b)
                });
            } else {
                max = 1;
            }
            console.log("page scrapped:" + currentPage + "/" + max);
            if (currentPage < max) {
                await Promise.all([await page.waitForSelector('nav.hd-pagination > ul > li:last-child > a,button', { waitUntil: 'load' }),
                    await page.click("nav.hd-pagination > ul > li:last-child"),
                    await page.waitForTimeout(10000),
                    pagesToScrape++,
                ]);
            } else {
                console.log(urls.length);
            }
            currentPage++;
        }
        await browser.close();
        await insertProduct(urls, conn_catalog_product, conn_catalog_urls);
        console.log("-------------", urls.length)
        resolve()
    } catch (err) {
        console.log("---------------------------------------------------------------------ERROR OCCURS", err);
        reject(err)
    }
})


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

const callFetchProduct = (catalog_url_data, website, conn_catalog_product, conn_catalog_urls) => new Promise(async (resolve, reject) => {

    console.log("\n");
    console.log('Waiting Time : 1 Seconds....................');
    console.log("\n");
    console.log("---------------------------------------------------------------------Total Urls Pending To Check  :: " + catalog_url_data.length);

    console.log('#######################################################################################################');

    console.log("---------------------------------------------------------------------START :: start_scrapping ");

    var pendingUrls = catalog_url_data;
    var currentUrl = pendingUrls.splice(-1);
    try {

        if (website == "homedepot") await scrapHomeDepotProduct(currentUrl[0], website, conn_catalog_product, conn_catalog_urls);
        else if (website == "ferguson") await scrapFergusonProduct(currentUrl[0], website, conn_catalog_product, conn_catalog_urls);

        if (pendingUrls.length > 0) {
            callFetchProduct(pendingUrls, website, conn_catalog_product, conn_catalog_urls);
        } else {
            console.log('*************************************************************************');
            console.log('ALL URLS ARE PROCESSED ------ Going to start scrapping again ');
            console.log('*************************************************************************');
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
        callFetchProduct(catalog_url_data, website, conn_catalog_product, conn_catalog_urls)
    } else {
        console.log(`No catalog url found for ${website}`)
    }
});


//*******************************************************************************************************
var master_website_list = ['homedepot', 'ferguson'];
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