import axios from "axios";
import { parseStringPromise } from "xml2js";

const rateLimitWindowMS = 60 * 1000; // 1 minuutti
const maxRequestsPerWindow = 10;
const ipRequestLog = {};

export default async function handler(req, res) {
  try {
    // Hae käyttäjän IP-osoite (Vercelissä tämä toimii näin)
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (!ipRequestLog[ip]) {
      ipRequestLog[ip] = [];
    }

    const currentTime = Date.now();

    // Suodata pois yli 1 min vanhat pyynnöt
    ipRequestLog[ip] = ipRequestLog[ip].filter(timestamp => currentTime - timestamp < rateLimitWindowMS);

    if (ipRequestLog[ip].length >= maxRequestsPerWindow) {
      // Rajoitus ylittynyt
      res.status(429).json({ error: "Liikaa pyyntöjä, yritä hetken päästä uudelleen." });
      return;
    }

    // Lisää tämänhetkinen pyyntö
    ipRequestLog[ip].push(currentTime);

    // Haetaan RSS ja parsitaan
    const rssUrl = "https://yle.fi/rss/t/18-204933/fi";
    const response = await axios.get(rssUrl);
    const data = await parseStringPromise(response.data);

    const items = data.rss.channel[0].item;

    res.status(200).json(items);
  } catch (error) {
    console.error("Virhe haettaessa uutisia:", error.message);
    res.status(500).json({ error: "Uutisten haku epäonnistui." });
  }
}
