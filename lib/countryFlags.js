// Maps pesdb.net "nationality" strings to ISO 3166-1 alpha-2 codes so we can
// render a flag image next to search results and table rows.
const COUNTRY_CODES = {
  // Europe
  England: "GB-ENG",
  Scotland: "GB-SCT",
  Wales: "GB-WLS",
  "Northern Ireland": "GB-NIR",
  "Republic of Ireland": "IE",
  Ireland: "IE",
  France: "FR",
  Germany: "DE",
  Spain: "ES",
  Italy: "IT",
  Portugal: "PT",
  Netherlands: "NL",
  Belgium: "BE",
  Switzerland: "CH",
  Austria: "AT",
  Sweden: "SE",
  Norway: "NO",
  Denmark: "DK",
  Finland: "FI",
  Iceland: "IS",
  Poland: "PL",
  Ukraine: "UA",
  Russia: "RU",
  Turkey: "TR",
  Croatia: "HR",
  Serbia: "RS",
  Slovenia: "SI",
  Slovakia: "SK",
  "Czech Republic": "CZ",
  Czechia: "CZ",
  Hungary: "HU",
  Romania: "RO",
  Bulgaria: "BG",
  Greece: "GR",
  Israel: "IL",
  Albania: "AL",
  "North Macedonia": "MK",
  Macedonia: "MK",
  "Bosnia and Herzegovina": "BA",
  "Bosnia-Herzegovina": "BA",
  Montenegro: "ME",
  Kosovo: "XK",
  Georgia: "GE",
  Armenia: "AM",
  Azerbaijan: "AZ",
  Belarus: "BY",
  Estonia: "EE",
  Latvia: "LV",
  Lithuania: "LT",
  Luxembourg: "LU",
  Malta: "MT",
  Cyprus: "CY",
  Andorra: "AD",
  "San Marino": "SM",
  "Faroe Islands": "FO",
  Gibraltar: "GI",
  Kazakhstan: "KZ",
  Uzbekistan: "UZ",
  Moldova: "MD",
  Liechtenstein: "LI",
  Monaco: "MC",

  // South America
  Brazil: "BR",
  Argentina: "AR",
  Uruguay: "UY",
  Colombia: "CO",
  Chile: "CL",
  Peru: "PE",
  Ecuador: "EC",
  Paraguay: "PY",
  Bolivia: "BO",
  Venezuela: "VE",
  Suriname: "SR",
  Guyana: "GY",
  "French Guiana": "GF",

  // North & Central America, Caribbean
  Mexico: "MX",
  "Costa Rica": "CR",
  Panama: "PA",
  Jamaica: "JM",
  Honduras: "HN",
  "United States": "US",
  USA: "US",
  Canada: "CA",
  "Curaçao": "CW",
  Curacao: "CW",
  "Trinidad and Tobago": "TT",
  Haiti: "HT",
  "Dominican Republic": "DO",
  Cuba: "CU",
  "Puerto Rico": "PR",
  "El Salvador": "SV",
  Guatemala: "GT",
  Nicaragua: "NI",
  Belize: "BZ",
  Barbados: "BB",
  Bermuda: "BM",
  Grenada: "GD",
  "Saint Lucia": "LC",
  "Saint Vincent and the Grenadines": "VC",
  "Antigua and Barbuda": "AG",
  "Saint Kitts and Nevis": "KN",
  Guadeloupe: "GP",
  Martinique: "MQ",

  // Asia & Middle East
  Japan: "JP",
  "South Korea": "KR",
  "Korea Republic": "KR",
  China: "CN",
  "China PR": "CN",
  India: "IN",
  Indonesia: "ID",
  Thailand: "TH",
  Vietnam: "VN",
  Malaysia: "MY",
  Philippines: "PH",
  "Saudi Arabia": "SA",
  Qatar: "QA",
  "United Arab Emirates": "AE",
  UAE: "AE",
  Iran: "IR",
  Iraq: "IQ",
  Jordan: "JO",
  Lebanon: "LB",
  Syria: "SY",
  Kuwait: "KW",
  Bahrain: "BH",
  Oman: "OM",
  Yemen: "YE",
  Palestine: "PS",
  "North Korea": "KP",
  Mongolia: "MN",
  "Hong Kong": "HK",
  Macau: "MO",
  "Chinese Taipei": "TW",
  Taiwan: "TW",
  Singapore: "SG",
  Myanmar: "MM",
  Cambodia: "KH",
  Laos: "LA",
  Brunei: "BN",
  "Timor-Leste": "TL",
  "East Timor": "TL",
  Nepal: "NP",
  Bangladesh: "BD",
  "Sri Lanka": "LK",
  Maldives: "MV",
  Bhutan: "BT",
  Afghanistan: "AF",
  Pakistan: "PK",
  Tajikistan: "TJ",
  Kyrgyzstan: "KG",
  Turkmenistan: "TM",

  // Africa
  Nigeria: "NG",
  Senegal: "SN",
  Morocco: "MA",
  Egypt: "EG",
  Algeria: "DZ",
  Tunisia: "TN",
  Ghana: "GH",
  Cameroon: "CM",
  "Côte d'Ivoire": "CI",
  "Cote d'Ivoire": "CI",
  "Ivory Coast": "CI",
  "Côte d&apos;Ivoire": "CI",
  "Cote d&apos;Ivoire": "CI",
  Mali: "ML",
  "Burkina Faso": "BF",
  "DR Congo": "CD",
  "Congo DR": "CD",
  "Democratic Republic of the Congo": "CD",
  "Republic of the Congo": "CG",
  Congo: "CG",
  Zambia: "ZM",
  Kenya: "KE",
  Ethiopia: "ET",
  Angola: "AO",
  Gabon: "GA",
  Guinea: "GN",
  "Cape Verde": "CV",
  "Cabo Verde": "CV",
  "South Africa": "ZA",
  Uganda: "UG",
  Tanzania: "TZ",
  "Equatorial Guinea": "GQ",
  "Guinea-Bissau": "GW",
  "Sierra Leone": "SL",
  Benin: "BJ",
  Togo: "TG",
  "Central African Republic": "CF",
  Comoros: "KM",
  Madagascar: "MG",
  Mauritania: "MR",
  Mauritius: "MU",
  Mozambique: "MZ",
  Namibia: "NA",
  Niger: "NE",
  Rwanda: "RW",
  Seychelles: "SC",
  "South Sudan": "SS",
  Sudan: "SD",
  Zimbabwe: "ZW",
  Gambia: "GM",
  Liberia: "LR",
  Libya: "LY",
  Malawi: "MW",
  Burundi: "BI",
  Chad: "TD",
  Djibouti: "DJ",
  Eritrea: "ER",
  Eswatini: "SZ",
  Swaziland: "SZ",
  Botswana: "BW",
  Lesotho: "LS",
  Somalia: "SO",
  "São Tomé and Príncipe": "ST",
  "Sao Tome and Principe": "ST",

  // Oceania
  Australia: "AU",
  "New Zealand": "NZ",
  Fiji: "FJ",
  "Papua New Guinea": "PG",
  Tahiti: "PF",
  "New Caledonia": "NC",
  "Solomon Islands": "SB",
  Vanuatu: "VU",
  Samoa: "WS",
  "American Samoa": "AS",
  Tonga: "TO",
  "Cook Islands": "CK",
  Guam: "GU",
};

// Flag emoji are unreliable on Windows (many fonts render the ISO code as
// plain text instead of a flag glyph), so use real flag images from
// flagcdn.com instead. It supports both ISO 3166-1 (fr, pt, br...) and the
// UK constituent countries (gb-eng, gb-sct, gb-wls) in the same lowercase,
// hyphenated format stored in COUNTRY_CODES.
export function getFlagUrl(nationality) {
  if (!nationality || typeof nationality !== "string") return null;

  // 1. Decode HTML entities and clean quotes/whitespace
  const cleaned = nationality
    .replace(/&apos;|&#39;|’|`/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;

  // 2. Direct lookup
  let code = COUNTRY_CODES[cleaned];

  // 3. Accent-stripped lookup (e.g. "Côte d'Ivoire" -> "Cote d'Ivoire")
  if (!code) {
    const unaccented = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    code = COUNTRY_CODES[unaccented];
  }

  // 4. Case-insensitive lookup fallback
  if (!code) {
    const lower = cleaned.toLowerCase();
    const matchKey = Object.keys(COUNTRY_CODES).find(
      (k) => k.toLowerCase() === lower
    );
    if (matchKey) code = COUNTRY_CODES[matchKey];
  }

  // 5. Case-insensitive on unaccented version fallback
  if (!code) {
    const unaccentedLower = cleaned
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const matchKey = Object.keys(COUNTRY_CODES).find(
      (k) =>
        k
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase() === unaccentedLower
    );
    if (matchKey) code = COUNTRY_CODES[matchKey];
  }

  if (!code) return null;
  return `https://flagcdn.com/${code.toLowerCase()}.svg`;
}
