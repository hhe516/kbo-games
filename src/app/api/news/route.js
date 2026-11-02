// 스토브리그 뉴스: 구글 뉴스 검색 RSS 에서 KBO FA·트레이드 기사 제목만 가져와 메인에 띄움
// - 기사 본문은 안 가져오고 제목·언론사·링크만 (원문은 언론사 사이트로 이동)
// - 30분마다 새로 받음 (그 사이엔 Vercel 캐시)

const QUERIES = ["KBO FA 계약", "KBO 트레이드", "프로야구 FA 영입"];
const RSS = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q + " when:7d")}&hl=ko&gl=KR&ceid=KR:ko`;
const LIMIT = 6;

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : "";
};

function parse(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const source = tag(item, "source");
    let title = tag(item, "title");
    // 구글 뉴스 제목 끝의 " - 언론사" 떼기
    while (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    return { title, link: tag(item, "link"), source, time: Date.parse(tag(item, "pubDate")) || 0 };
  });
}

export async function GET() {
  try {
    const lists = await Promise.all(
      QUERIES.map((q) =>
        fetch(RSS(q), { next: { revalidate: 1800 } })
          .then((r) => (r.ok ? r.text() : ""))
          .then(parse)
          .catch(() => [])
      )
    );
    // 합치고, 같은 기사(제목 앞부분이 같은 것) 빼고, 최신순
    const seen = new Set();
    const items = lists
      .flat()
      .filter((a) => a.title && a.link)
      .sort((a, b) => b.time - a.time)
      .filter((a) => {
        const key = a.title.replace(/\s+/g, "").slice(0, 18);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, LIMIT);
    return Response.json({ items }, { headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" } });
  } catch {
    return Response.json({ items: [] });
  }
}
