import ct from "countries-and-timezones";
import countries from "i18n-iso-countries";
import fs from "fs";

const enLocale = JSON.parse(fs.readFileSync(new URL('../node_modules/i18n-iso-countries/langs/en.json', import.meta.url)));


// Register English locale
countries.registerLocale(enLocale);

const timezoneToCountryName = (timezone) => {
  const zone = ct.getTimezone(timezone); // { name, utcOffset, countries: [...] }
  if (!zone) return null;

  const code = zone.countries?.[0]; // usually one country per timezone
  if (!code) return null;

  const name = countries.getName(code, "en"); 
  return { code, name , timezone  };
};
export default timezoneToCountryName;

// console.log(timezoneToCountryName("Europe/Amsterdam"));
    