import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 | ⚾KBO Games",
};

const CONTACT =
  "https://docs.google.com/forms/d/e/1FAIpQLSeMncbGJK3zd04feEWU7ctohNxfk5Clj_RZyBxD6zugjxZwng/viewform?usp=publish-editor";

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-black text-gray-900">{title}</h2>
    <div className="space-y-2 text-gray-700 leading-7">{children}</div>
  </section>
);

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 md:p-10 shadow-xl space-y-8">
        <div>
          <h1 className="text-3xl font-black">개인정보처리방침</h1>
          <p className="mt-2 text-sm text-gray-500">시행일: 2026년 10월 12일</p>
        </div>

        <p className="text-gray-700 leading-7">
          KBO Games(이하 &quot;사이트&quot;, kbogames.com)는 KBO 야구 선수 퀴즈 게임을 제공하는 비공식 팬 사이트입니다.
          사이트는 이용자의 개인정보를 소중히 다루며, 아래와 같이 필요한 최소한의 정보만 처리합니다.
        </p>

        <Section title="1. 수집하는 정보">
          <p>
            <strong>로그인하지 않은 경우</strong>: 개인정보를 수집하지 않습니다. 게임 진행 상황과 데일리 기록은 이용자 기기의
            브라우저 저장소(localStorage)에만 저장되며 사이트 운영자에게 전송되지 않습니다.
          </p>
          <p>
            <strong>구글 계정으로 로그인한 경우</strong>: 구글이 제공하는 다음 정보를 받습니다.
          </p>
          <ul className="list-disc ml-6">
            <li>이메일 주소, 이름, 프로필 사진 주소</li>
            <li>구글 계정 고유 식별자</li>
          </ul>
          <p>또한 이용자가 플레이한 데일리 문제의 결과(날짜, 게임 종류, 점수, 진행 상황)를 저장합니다.</p>
        </Section>

        <Section title="2. 이용 목적">
          <ul className="list-disc ml-6">
            <li>로그인 및 이용자 식별</li>
            <li>데일리 문제 기록과 연속 기록을 여러 기기에서 이어서 볼 수 있도록 저장</li>
          </ul>
          <p>광고, 마케팅, 판매 등 다른 목적으로는 사용하지 않습니다.</p>
        </Section>

        <Section title="3. 보관 기간 및 삭제">
          <p>
            로그인 정보와 기록은 이용자가 삭제를 요청할 때까지 보관하며, 요청을 받으면 지체 없이 삭제합니다. 사이트 운영을
            종료하는 경우에도 모든 정보를 삭제합니다.
          </p>
        </Section>

        <Section title="4. 처리를 맡기는 곳 (위탁 및 국외 이전)">
          <p>사이트는 다음 서비스를 이용해 운영되며, 정보는 해당 서비스에 저장·처리될 수 있습니다.</p>
          <ul className="list-disc ml-6">
            <li>Supabase: 로그인 처리 및 기록 저장</li>
            <li>Google: 구글 계정 로그인</li>
            <li>Vercel: 웹사이트 호스팅</li>
          </ul>
          <p>그 밖의 제3자에게 개인정보를 제공하지 않습니다.</p>
        </Section>

        <Section title="5. 이용자의 권리">
          <p>
            이용자는 언제든지 자신의 정보 열람, 수정, 삭제를 요청할 수 있습니다. 로그아웃은 사이트 메뉴에서 바로 할 수 있으며,
            계정 및 기록 삭제는 아래 문의 창구로 요청해 주세요.
          </p>
        </Section>

        <Section title="6. 문의">
          <p>
            개인정보 관련 문의와 삭제 요청은{" "}
            <a href={CONTACT} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              문의 양식
            </a>
            으로 보내 주세요.
          </p>
        </Section>

        <Section title="7. 변경">
          <p>이 방침이 바뀌면 이 페이지에 시행일과 함께 공지합니다.</p>
        </Section>

        <Link href="/" className="inline-block rounded-xl bg-gray-200 px-4 py-2 font-bold hover:bg-gray-300">
          🏠 홈으로
        </Link>
      </div>
    </main>
  );
}
