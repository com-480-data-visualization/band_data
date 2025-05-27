import fsExtra from 'fs-extra';
import convertCountryCodes from 'convert-country-codes';
import * as countriesLib from "countries-list"

const countries = await fsExtra.readJson("../data/countries.geojson")

const countryInfo = {}
for (const feature of countries.features) {
    const iso = feature.properties.ISO
    const ioc = convertCountryCodes.convertIso2Code(iso).ioc
    countryInfo[ioc] = {
        "coords": feature.geometry.coordinates,
        "ISO": iso,
        "country": feature.properties.COUNTRY,
        "continent": countriesLib.countries[iso].continent,
        "emojiflag": countriesLib.getEmojiFlag(iso)
    }
}

const additionalCountries = [
    {
        "ISO": "TW", // Taiwan
        "coords": [121.0,24.0]
    },
    {
        "ISO": "ME", // Montenegro
        "ioc": "MNE", // library gets it wrong, why??
        "coords": [19.29505087156758,42.73694835210454]
    },
]
for (const feature of additionalCountries) {
    const iso = feature.ISO
    const ioc = feature?.ioc ?? convertCountryCodes.convertIso2Code(iso).ioc
    countryInfo[ioc] = {
        "coords": feature.coords,
        "ISO": iso,
        "country": countriesLib.countries[iso].name,
        "continent": countriesLib.countries[iso].continent,
        "emojiflag": countriesLib.getEmojiFlag(iso)
    }
}

countryInfo["YUG"] = {
    "coords": [19.11770783922817,44.4432909504038],
    "ISO": "YU",
    "country": "Yugoslavia",
    "continent": "EU",
    "emojiflag": ""
}

countryInfo["SCG"] = {
    "coords": [21.035781106189646, 43.7633334607039],
    "ISO": "CS",
    "country": "Serbia and Montenegro",
    "continent": "EU",
    "emojiflag": ""
}

countryInfo["URS"] = {
    "coords": [98.6704990698032, 59.039434214106194],
    "ISO": "SU",
    "country": "Soviet Union",
    "continent": "AS",
    "emojiflag": "🇷🇺"
}

countryInfo["TCH"] = {
    "coords": [17.601104234712423, 49.35067718787713],
    "ISO": "CS",
    "country": "Czechoslovakia",
    "continent": "EU",
    "emojiflag": ""
}

countryInfo["HKG"] = {
    "coords": [114.1849161, 22.350627],
    "ISO": "HK",
    "country": "Hong Kong",
    "continent": "AS",
    "emojiflag": ""
}

try {
  await fsExtra.writeJson("../docs/data/countries.json", countryInfo, { spaces: 2 });
  console.log('JSON file written successfully!');
} catch (err) {
  console.error('Error writing JSON file:', err);
}