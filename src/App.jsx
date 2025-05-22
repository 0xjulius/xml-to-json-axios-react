import React, { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get("/api/news")
      .then(res => {
        setArticles(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError("Uutisten haku epäonnistui.");
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-4 text-center">Ladataan uutisia...</p>;
  if (error) return <p className="p-4 text-center text-red-600">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Yle RSS Uutiset</h1>
      <ul className="space-y-4">
        {articles.map((article, i) => (
          <li key={i} className="border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow">
            <a href={article.link[0]} target="_blank" rel="noreferrer" className="text-xl font-semibold text-blue-600 hover:underline">
              {article.title[0]}
            </a>
            <p className="text-gray-700 mt-2">{article.description[0]}</p>
            <p className="text-sm text-gray-500 mt-1">
              Julkaistu: {new Date(article.pubDate[0]).toLocaleString("fi-FI")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
