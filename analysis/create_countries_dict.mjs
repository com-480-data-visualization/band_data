import fsExtra from 'fs-extra';
import convertCountryCodes from 'convert-country-codes';

const countries = await fsExtra.readJson("../data/countries.geojson")

const countryCoords = {}
for (const feature of countries.features) {
    const ioc = convertCountryCodes.convertIso2Code(feature.properties.ISO).ioc
    countryCoords[ioc] = feature.geometry.coordinates
}

try {
  await fsExtra.writeJson("../docs/data/countries.json", countryCoords, { spaces: 2 });
  console.log('JSON file written successfully!');
} catch (err) {
  console.error('Error writing JSON file:', err);
}