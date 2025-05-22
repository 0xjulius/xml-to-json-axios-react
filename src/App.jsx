import React, { useEffect, useState } from "react";
import axios from "axios";
import { XMLParser } from "fast-xml-parser"; 
import "./App.css";

export default function App() {
  // tänne laitetaan ne uutiset mitä haetaan
  const [articles, setArticles] = useState([]);

  // kertoo ladataanko vielä vai ei
  const [loading, setLoading] = useState(true);

  // tähän virhe jos tulee
  const [error, setError] = useState(null);

  // base64 -> normaali teksti, tarvitaan jos data base64:ssa
  const base64ToUtf8 = (str) =>
    decodeURIComponent(
      Array.from(atob(str))
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );

  useEffect(() => {
    // max monta fetchiä sallitaan (tässä 5)
    const maxFetches = 5;
    // avaimet localStorageen
    const fetchCountKey = "fetchCount";
    const fetchTimeKey = "fetchTime";
    const now = Date.now();

    // haetaan localstoragesta vanhat arvot, jos ei oo niin nollaa ne
    let storedCount = parseInt(localStorage.getItem(fetchCountKey)) || 0;
    const storedTime = parseInt(localStorage.getItem(fetchTimeKey)) || 0;

    // jos viime hausta on yli minuutti, nollataan laskuri
    if (now - storedTime > 60000) {
      storedCount = 0;
    }

    // jos on menty yli sallitun määrän, näytetään virhe eikä haeta
    if (storedCount >= maxFetches) {
      setError("haettu liian monta kertaa, odota hetki ennen uudelleen yrittämistä.");
      setLoading(false);
      return; // ei jatketa
    }

    const proxyUrl = "https://api.allorigins.win/get?url=";
    const feedUrl = "https://yle.fi/rss/t/18-204933/fi";

    // haetaan data proxyn kautta
    axios
      .get(proxyUrl + encodeURIComponent(feedUrl))
      .then((res) => {
        let xmlString = res.data.contents;

        // jos base64, puretaan se normiksi tekstiksi
        if (xmlString.startsWith("data:application/rss+xml;")) {
          const base64Data = xmlString.split(",")[1];
          xmlString = base64ToUtf8(base64Data);
        }

        // parsitaan xml jsoniksi
        const parser = new XMLParser();
        const jsonObj = parser.parse(xmlString);

        // otetaan uutiset jsonista
        let items = jsonObj?.rss?.channel?.item || [];
        if (!Array.isArray(items)) items = [items]; // jos yks uutinen niin laitetaan taulukkoon

        setArticles(items); // päivitetään state
        setLoading(false); // kerrotaan että lataus ohi

        // tallennetaan uusi fetchien määrä ja aika localStorageen
        localStorage.setItem(fetchCountKey, storedCount + 1);
        localStorage.setItem(fetchTimeKey, now.toString());
      })
      .catch((err) => {
        // jos virhe nii näytetään se
        console.error("fetch error:", err);
        setError("uutisten haku epäonnistui.");
        setLoading(false);
      });
  }, []);

  // jos ladataan vielä, näytetään latausteksti
  if (loading)
    return (
      <p className="p-6 text-center text-blue-800 bg-white bg-opacity-80 rounded-md shadow">
        ladataan uutisia...
      </p>
    );

  // jos virhe, näytetään se
  if (error)
    return (
      <p className="p-6 text-center text-red-600 bg-white bg-opacity-80 rounded-md shadow">
        {error}
      </p>
    );

  // näyttää uutiset listana
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white bg-opacity-90 p-6 rounded-xl shadow-xl">
        <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-700">
          Ylen talous-uutiset
        </h1>
        <ul className="space-y-6">
          {articles.map((item, i) => {
            // otetaan otsikko, linkki, kuvaus ja päivämäärä varmuuden vuoksi stringinä
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
                <p className="text-gray-700 mt-2 leading-relaxed">{description}</p>
                <p className="text-sm text-gray-500 mt-3">{pubDate}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
