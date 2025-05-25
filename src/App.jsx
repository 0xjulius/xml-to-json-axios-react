import React, { useEffect, useState } from "react";
import axios from "axios"; // http-kutsuihin
import { XMLParser } from "fast-xml-parser"; // xml:n parsintaan
import "./App.css";

const FEEDS = { // rss-feedien osoitteet
  talous: "https://yle.fi/rss/t/18-204933/fi", 
  tuoreimmat: "https://yle.fi/rss/uutiset/tuoreimmat",
  luetuimmat: "https://yle.fi/rss/uutiset/luetuimmat",
  pääuutiset: "https://yle.fi/rss/uutiset/paauutiset",
};

const MAX_REFRESHES = 5; // montako kertaa voi päivittää minuutissa
const REFRESH_INTERVAL = 60 * 1000; // 1 minuutti millisekunteina

export default function App() {
  const [articles, setArticles] = useState([]); // uutiset taulukossa
  const [selectedFeed, setSelectedFeed] = useState("talous"); // valittu feed
  const [loading, setLoading] = useState(true); // ladataanko vielä
  const [error, setError] = useState(null); // virheilmoitus
  const [lastUpdated, setLastUpdated] = useState(""); // viimeisin päivitysaika

  // dekoodaa base64-muotoisen tekstin UTF-8 muotoon
  const base64ToUtf8 = (str) =>
    decodeURIComponent(
      Array.from(atob(str))
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    );

  // hakee uutiset valitusta feedistä
  const fetchNews = async (feedKey) => {
    setLoading(true); // laitetaan lataustila päälle
    setError(null); // tyhjennetään virheet

    const now = Date.now();
    const refreshCountKey = `refreshCount_${feedKey}`; // localstorage-avain päivitysmäärälle
    const refreshTimeKey = `refreshTime_${feedKey}`; // viimeisen päivityksen aika
    let refreshCount = parseInt(localStorage.getItem(refreshCountKey)) || 0; // haetaan montako kertaa on päivitetty
    let lastRefreshTime = parseInt(localStorage.getItem(refreshTimeKey)) || 0; // viime kerta millisekunteina

    // jos viime päivityksestä yli minuutti, nollataan laskuri
    if (now - lastRefreshTime > REFRESH_INTERVAL) {
      refreshCount = 0;
    }

    // jos päivitetty jo maksimimäärä, näytetään virhe ja vanhat uutiset
    if (refreshCount >= MAX_REFRESHES) {
      setError("Liian monta yritystä, yritä minuutin kuluttua uudelleen.");
      setLoading(false);

      const saved = localStorage.getItem(`articles_${feedKey}`); // haetaan tallennetut
      if (saved) {
        setArticles(JSON.parse(saved));
        const time = localStorage.getItem(`lastUpdated_${feedKey}`);
        if (time) {
          setLastUpdated(new Date(time).toLocaleTimeString("fi-FI"));
        }
      }
      return; // lopetetaan tänne
    }

    // kasvatetaan päivityslaskuria ja tallennetaan aika
    localStorage.setItem(refreshCountKey, (refreshCount + 1).toString());
    localStorage.setItem(refreshTimeKey, now.toString());

    const proxyUrl = "https://api.allorigins.win/get?url="; // cors-proxy
    const feedUrl = FEEDS[feedKey]; // valittu feedin url

    try {
      // tehdään http-kutsu proxyn kautta
      const res = await axios.get(proxyUrl + encodeURIComponent(feedUrl));
      let xmlString = res.data.contents; // saadaan xml-data

      // jos data on base64-koodattu, dekoodataan se
      if (xmlString.startsWith("data:application/rss+xml;")) {
        const base64Data = xmlString.split(",")[1];
        xmlString = base64ToUtf8(base64Data);
      }

      const parser = new XMLParser(); // tehdään xml-parseri
      const jsonObj = parser.parse(xmlString); // parsitaan xml jsoniksi
      let items = jsonObj?.rss?.channel?.item || []; // otetaan uutiset
      if (!Array.isArray(items)) items = [items]; // jos vaan yks uutinen, tehdään listaksi

      setArticles(items); // laitetaan uutiset tilaan
      localStorage.setItem(`articles_${feedKey}`, JSON.stringify(items)); // tallennetaan localstorageen
      localStorage.setItem(`lastUpdated_${feedKey}`, new Date().toISOString()); // tallennetaan päivitysaika
      setLastUpdated(new Date().toLocaleTimeString("fi-FI")); // näytetään viimeisin päivitys
      setError(null); // ei virhettä
    } catch (err) {
      console.error("fetch error:", err);
      setError("Uutisten haku epäonnistui."); // näytetään virhe
      setLoading(false);

      // virhetilanteessa näytetään tallennetut uutiset localstoragesta
      const saved = localStorage.getItem(`articles_${feedKey}`);
      if (saved) {
        setArticles(JSON.parse(saved));
        const time = localStorage.getItem(`lastUpdated_${feedKey}`);
        if (time) {
          setLastUpdated(new Date(time).toLocaleTimeString("fi-FI"));
        }
      }
    } finally {
      setLoading(false); // lopuksi poistetaan lataustila
    }
  };

  // kutsutaan kun valittu feed vaihtuu
  useEffect(() => {
    const saved = localStorage.getItem(`articles_${selectedFeed}`); // katsotaan onko tallennettuja uutisia
    const time = localStorage.getItem(`lastUpdated_${selectedFeed}`);
    if (saved) {
      setArticles(JSON.parse(saved)); // jos on, laitetaan ne heti näytille
      if (time) {
        setLastUpdated(new Date(time).toLocaleTimeString("fi-FI"));
      }
      setLoading(false); // ei tarvi ladata
    } else {
      fetchNews(selectedFeed); // muuten haetaan uudet
    }
  }, [selectedFeed]); // riippuu selectedFeedistä

  return (
    <div className="min-h-screen  py-10 px-4 body">
      <div className="max-w-4xl mx-auto bg-white bg-opacity-90 p-6 rounded-xl shadow-xl">
        <h1 className="text-4xl font-extrabold mb-6 text-center text-gradient">
          Ylen uutiset
        </h1>

        {/* napit feedien valintaan */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {Object.keys(FEEDS).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedFeed(key)} // vaihdetaan feediä napista
              className={`px-4 py-2 cursor-pointer rounded-full text-sm font-medium transition shadow ${
                selectedFeed === key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-blue-200"
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}{" "}
              {/* isolla eka kirjain */}
            </button>
          ))}
        </div>

        {/* päivitys nappi ja viimeisin päivitysaika */}
        <div className="flex justify-between items-center mb-4 px-1 text-sm text-gray-600">
          <button
            onClick={() => fetchNews(selectedFeed)} // päivitetään kun painetaan
            className="bg-blue-600 cursor-pointer hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow"
          >
            Päivitä uutiset
          </button>
          {lastUpdated && <p>Viimeksi päivitetty: {lastUpdated}</p>}
        </div>

        {/* näytetään lataustila, virhe tai uutiset */}
        {loading ? (
          <p className="text-blue-700">Ladataan uutisia...</p> // latauksen aikana
        ) : error ? (
          <p className="text-red-600">{error}</p> // jos virhe
        ) : (
          <ul className="space-y-6">
            {articles.map((item, i) => {
              const title =
                typeof item.title === "string"
                  ? item.title
                  : item.title?.["#text"] || "ei otsikkoa"; // varmistetaan otsikko
              const link =
                typeof item.link === "string"
                  ? item.link
                  : item.link?.["#text"] || "#"; // varmistetaan linkki
              const description =
                typeof item.description === "string"
                  ? item.description
                  : item.description?.["#text"] || ""; // varmistetaan kuvaus
              const pubDate = item.pubDate
                ? new Date(item.pubDate).toLocaleString("fi-FI")
                : ""; // päivämäärä suomeksi

              return (
                <li
                  key={item.guid || item.link || i} // yksilöllinen key listalle
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
        )}
      </div>
    </div>
  );
}
