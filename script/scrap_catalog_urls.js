var cheerio = require('cheerio');
var request = require('request');
const async = require("async");
var mongoose = require('mongoose')

//*******************************************************************************************************
//*******************************************************************************************************
let dbUrl = 'mongodb://127.0.0.1/estimater';

var conn_pg_catalog_urls = mongoose.createConnection(dbUrl, { useUnifiedTopology: true, useNewUrlParser: true });
var schema_catalog_urls = mongoose.Schema({}, {
    strict: false,
    collection: 'catalog_urls'
});
var conn_catalog_urls = conn_pg_catalog_urls.model('catalog_urls', schema_catalog_urls);

//*******************************************************************************************************


const insertProduct = (allUrls) => new Promise((resolve, reject) => {
    console.log("-------------------------------Insert URLs in the db -------------------------------");
    try {
        console.log(`-------------------------------Total URLs found ${allUrls.length} -------------------------------`);
        allUrls.map(async (data) => {
            let record = await conn_catalog_urls.findOne({ url: data.url, website: data.website });
            if (!record) await conn_catalog_urls.create(data)
            return;
        })
        resolve();
    } catch (err) {
        console.log(err)
        resolve(err);

    }
    console.log("-------------------------------URLs inserted succesfully-------------------------------");
});




let allUrls = [];
const scrapHomeDepot = () => new Promise(async (resolve, reject) => {
    console.log("-------------------------------Scrap homedepot data-------------------------------");
    var urls = ["https://www.homedepot.com/b/Home-Decor-Home-Accents/N-5yc1vZar58",
        "https://www.homedepot.com/b/Home-Decor-Bedding-Bath/N-5yc1vZci04",
        //"https://www.homedepot.com/b/Home-Decor-Wall-Decor/N-5yc1vZar8x",
        //"https://www.homedepot.com/b/Lighting/N-5yc1vZbvn5",
        //"https://www.homedepot.com/b/Flooring-Rugs-Area-Rugs/N-5yc1vZarjg",
        "https://www.homedepot.com/b/Window-Treatments/N-5yc1vZar4w",
        "https://www.homedepot.com/b/Kitchen-Kitchenware/N-5yc1vZaqzo",
        "https://www.homedepot.com/b/Kitchen-Tableware-Bar/N-5yc1vZc4c1",
        "https://www.homedepot.com/b/Kitchen-Kitchen-Storage-Organization/N-5yc1vZapu6",
        "https://www.homedepot.com/b/Appliances-Small-Kitchen-Appliances/N-5yc1vZbv48"
    ];
    async.eachSeries(urls, processUrl, async function(err) {
        if (err) console.log("Something went wrong");
        else {
            await insertProduct(allUrls);
            console.log("-------------------------------Scrap homedepot data suceesfully-------------------------------");
            resolve();
        }
    });

    function processUrl(url, callback) {
        request(url, function(err, resp, body) {
            if (err) callback(err);
            const $ = cheerio.load(body);
            $("#ColumnRail_thd_20cf > div > div > nav > ul > li > a").each(function(i, element) {
                const sul = $(element).attr('href');
                const tex = $(element).text();
                if (tex != 'Shop All') {
                    if (sul.includes('https')) {
                        allUrls.push({ url: sul, website: "homedepot" });
                    } else {
                        var add = "https://www.homedepot.com";
                        var urlsv = add.concat(sul);
                        allUrls.push({ url: urlsv, website: "homedepot" });
                    };
                };
            });
            callback();
        });
    }
});


function checkValidUrl($elemen, website) {
    if ($elemen.includes('https')) {
        var urlt = $elemen;
    } else {
        var add = website == "homedepot" ? "https://www.homedepot.com" : "https://www.ferguson.com";
        var urlsv = add.concat($elemen);
        var urlt = urlsv;
    }
    return urlt;
}

const scrapSiteMapUrls = (website, url, selector) => new Promise(async (resolve, reject) => {
    console.log("-------------------------------Start Checking For site map Catalog Urls-------------------------------");
    var siteMapUrls = [];
    request(url, async function(err, resp, body) {
        if (err) throw err;
        const $ = cheerio.load(body);
        $(selector).each(function(i, element) {
            if (website == "homedepot") {
                const $element = $(element).attr("href");
                var urld = checkValidUrl($element);
                if (urld.includes('https://www.homedepot.com/b/')) {
                    siteMapUrls.push({ url: urld, website })
                }
            } else {
                const $element = $(element).attr('data-url');
                var urld = checkValidUrl($element);
                siteMapUrls.push({ url: urld, website })
            }
        });
        console.log(`-------------------------------total urls found ${siteMapUrls.length}-------------------------------`);
        if (siteMapUrls.length != 0) {
            await insertProduct(siteMapUrls);
            console.log("-------------------------------all site map data processed suceesfully-------------------------------");
            resolve()
        } else {
            console.log("No url found");
            resolve();
        }
    });
});


const start = async (website) => {
    if (website == "homedepot") {
        url = 'https://www.homedepot.com/c/site_map';
        selector = "#container > div > div > div  > div > div > p > a"
    } else {
        url = "https://www.ferguson.com/category?icid=mrch_fly_prod_all-products";
        selector = "#wrapper > main > div > div > div > div > div:nth-child(1) > div> ul > li";
    }

    console.log("-------------------------------Going to fetch catalog urls-------------------------------");
    if (website == "homedepot") await scrapHomeDepot(website);
    await scrapSiteMapUrls(website, url, selector);
    console.log("-------------------------------All urls fetched suceesfully-------------------------------");
    start(website);
}


//*******************************************************************************************************
var master_website_list = ['homedepot', "ferguson"];
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
