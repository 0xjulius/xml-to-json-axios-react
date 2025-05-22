import React, { useEffect, useState } from "react";
import axios from "axios";
import { XMLParser } from "fast-xml-parser"; // XML to JSON
import "./App.css";

export default function App() {
  // tänne tallennetaan uutiset
  const [articles, setArticles] = useState([]);

  // kertoo näytetäänkö vielä lataustekstiä
  const [loading, setLoading] = useState(true);

  // virheviesti jos haku ei onnistu
  const [error, setError] = useState(null);

  // muuntaa base64-tekstin normaaliksi utf-8 tekstiksi
  const base64ToUtf8 = (str) =>
    decodeURIComponent(
      Array.from(atob(str))
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );

  // suoritetaan kun sivu ladataan
  useEffect(() => {
    // proxy tarvitaan koska selain ei suoraan anna hakea rss-syötettä eri domainista
    const proxyUrl = "https://api.allorigins.win/get?url=";

    // yle.fi:n rss-osoite
    const feedUrl = "https://yle.fi/rss/t/18-204933/fi";

    // haetaan rss-data proxyn kautta
    axios
      .get(proxyUrl + encodeURIComponent(feedUrl))
      .then((res) => {
        // xml-data löytyy tästä
        let xmlString = res.data.contents;

        // joskus data on base64-muodossa, joten dekoodataan
        if (xmlString.startsWith("data:application/rss+xml;")) {
          const base64Data = xmlString.split(",")[1];
          xmlString = base64ToUtf8(base64Data);
        }

        // xml-parseri muuttaa xml:n json-muotoon
        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlString); // jsonObj sisältää koko rss-syötteen

        // haetaan uutiset jsonista
        let items = jsonObj?.rss?.channel?.item || [];

        // jos uutisia on vain yksi, tehdään siitä taulukko
        if (!Array.isArray(items)) items = [items];

        // tallennetaan uutiset ja lopetetaan lataus
        setArticles(items);
        setLoading(false);
      })
      .catch((err) => {
        // virhetilanteessa näytetään viesti ja lopetetaan lataus
        console.error("Fetch error:", err);
        setError("Uutisten haku epäonnistui.");
        setLoading(false);
      });
  }, []);

  // jos vielä ladataan, näytetään latausteksti
  if (loading)
    return (
      <p className="p-6 text-center text-blue-800 bg-white bg-opacity-80 rounded-md shadow">
        ladataan uutisia...
      </p>
    );

  // jos tuli virhe, näytetään virheviesti
  if (error)
    return (
      <p className="p-6 text-center text-red-600 bg-white bg-opacity-80 rounded-md shadow">
        {error}
      </p>
    );

  // näytetään uutiset
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white bg-opacity-90 p-6 rounded-xl shadow-xl">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-700">
          Ylen talous-uutiset
        </h1>
        <ul className="space-y-6">
          {articles.map((item, i) => {
            // otetaan tarvittavat kentät talteen, ja varmistetaan että ne on string-muodossa
            const title =
              typeof item.title === "string"
                ? item.title
                : item.title?.["#text"] || "ei otsikkoa";
            const link =
              typeof item.link === "string"
                ? item.link
                : item.link?.["#text"] || "#";
            const description =
              typeof item.description === "string"
                ? item.description
                : item.description?.["#text"] || "";
            const pubDate = item.pubDate
              ? new Date(item.pubDate).toLocaleString("fi-FI")
              : "";

            // yksi uutinen
            return (
              <li
                key={item.guid || item.link || i}
                className="border border-gray-300 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 hover:shadow-xl transition-shadow duration-300"
              >
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xl font-semibold text-blue-600 hover:underline"
                >
                  {title}
                </a>
                <p className="text-gray-700 mt-2 leading-relaxed">
                  {description}
                </p>
                <p className="text-sm text-gray-500 mt-3">{pubDate}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
