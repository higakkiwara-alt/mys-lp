"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  const fadeRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );
    fadeRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addFadeRef = (el: HTMLElement | null) => {
    if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el);
  };

  return (
    <div style={{ fontFamily: "var(--font-noto-sans), sans-serif", color: "#1A1A1A", background: "#FFFFFF" }}>
      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 32px", backdropFilter: "blur(12px)",
        background: "rgba(255,255,255,0.92)", borderBottom: "1px solid rgba(184,151,90,0.15)",
      }}>
        <div style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "22px", letterSpacing: "0.3em", color: "#B8975A", fontWeight: 300 }}>M Y S</div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <a href="https://beauty.hotpepper.jp/slnH000721782/" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", padding: "10px 24px", background: "#B8975A", color: "#fff", textDecoration: "none", fontSize: "13px", letterSpacing: "0.1em" }}>
            ご予約
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", height: "100svh", minHeight: "600px", background: "#1A1A1A", paddingTop: "80px" }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <Image src="/hero.jpg" alt="Mys サロン" fill style={{ objectFit: "cover", objectPosition: "center top" }} priority />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(26,26,26,0.3) 0%, rgba(26,26,26,0.6) 100%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 24px" }}>
          <p style={{ color: "#D4B47A", fontSize: "11px", letterSpacing: "0.4em", marginBottom: "24px", fontWeight: 300 }}>HAIR QUALITY IMPROVEMENT SALON</p>
          <h1 style={{ color: "#fff", fontFamily: "var(--font-noto-serif), serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 300, lineHeight: 1.6, marginBottom: "32px" }}>
            あなたの髪の悩みを、<br />根本から解決する。
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px", lineHeight: 2, marginBottom: "40px", maxWidth: "480px" }}>
            立川・髪質改善専門サロン Mys（ミース）<br />
            縮毛矯正・酸熱トリートメントのプロフェッショナル
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            <a href="https://beauty.hotpepper.jp/slnH000721782/" target="_blank" rel="noopener noreferrer"
              style={{ padding: "14px 36px", background: "#B8975A", color: "#fff", textDecoration: "none", fontSize: "13px", letterSpacing: "0.15em" }}>
              Hotpepper 予約
            </a>
            <a href="https://line.me/R/ti/p/@906kdphu" target="_blank" rel="noopener noreferrer"
              style={{ padding: "14px 36px", border: "1px solid rgba(255,255,255,0.6)", color: "#fff", textDecoration: "none", fontSize: "13px", letterSpacing: "0.15em" }}>
              LINE で相談
            </a>
          </div>
        </div>
      </section>

      {/* Concept */}
      <section ref={addFadeRef} className="fade" style={{ background: "#EDE6D8", padding: "88px 24px", textAlign: "center" }}>
        <p style={{ color: "#B8975A", fontSize: "11px", letterSpacing: "0.4em", marginBottom: "24px" }}>CONCEPT</p>
        <h2 style={{ fontFamily: "var(--font-noto-serif), serif", fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 300, lineHeight: 1.8, marginBottom: "32px" }}>
          髪の「本質」に向き合う、<br />専門サロン。
        </h2>
        <p style={{ color: "#4A4A4A", fontSize: "15px", lineHeight: 2.2, maxWidth: "560px", margin: "0 auto" }}>
          一般的なサロンでは難しい「根本からの改善」を実現するために、<br />
          Mysは髪質改善に特化したメニューと技術を提供しています。<br />
          お客様一人ひとりの髪質・ライフスタイルに合わせた、<br />
          オーダーメイドの施術をご提案します。
        </p>
      </section>

      {/* Difference */}
      <section ref={addFadeRef} className="fade" style={{ padding: "88px 24px", textAlign: "center", maxWidth: "680px", margin: "0 auto" }}>
        <p style={{ color: "#B8975A", fontSize: "11px", letterSpacing: "0.4em", marginBottom: "24px" }}>DIFFERENCE</p>
        <h2 style={{ fontFamily: "var(--font-noto-serif), serif", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 300, lineHeight: 1.8, marginBottom: "48px" }}>Mys だけの違い</h2>
        {[
          ["施術特化", "髪質改善・縮毛矯正のみ", "全メニュー対応"],
          ["使用薬剤", "サロン専売・最高級品質", "市販品・汎用品"],
          ["カウンセリング", "60分以上の丁寧な診断", "10〜15分程度"],
          ["アフターケア", "ホームケア指導あり", "施術のみ"],
          ["通い方", "月1回の継続プラン推奨", "都度払い中心"],
          ["スタッフ", "髪質改善専門認定スタイリスト", "一般スタイリスト"],
          ["結果", "3ヶ月で実感できる変化", "一時的な改善"],
        ].map(([item, mys, others]) => (
          <div key={item} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "16px 0", borderBottom: "1px solid #EDE6D8", fontSize: "13px" }}>
            <div style={{ color: "#888", textAlign: "left" }}>{item}</div>
            <div style={{ color: "#B8975A", fontWeight: 500 }}>{mys}</div>
            <div style={{ color: "#aaa" }}>{others}</div>
          </div>
        ))}
      </section>

      {/* Menu */}
      <section ref={addFadeRef} className="fade" style={{ background: "#F8F4EE", padding: "88px 24px", textAlign: "center" }}>
        <p style={{ color: "#B8975A", fontSize: "11px", letterSpacing: "0.4em", marginBottom: "24px" }}>MENU & PRICE</p>
        <h2 style={{ fontFamily: "var(--font-noto-serif), serif", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 300, marginBottom: "48px" }}>メニュー・料金</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", maxWidth: "720px", margin: "0 auto" }}>
          {[
            { name: "髪質改善トリートメント", desc: "酸熱トリートメントで内部補修", price: "¥8,800〜" },
            { name: "縮毛矯正", desc: "ダメージレスな独自処方", price: "¥17,600〜" },
            { name: "髪質改善カラー", desc: "カラーしながら髪質改善", price: "¥14,300〜" },
            { name: "プレミアムトリートメント", desc: "最上位ケアで極上の仕上がり", price: "¥24,200〜" },
            { name: "カット + トリートメント", desc: "基本施術セット", price: "¥11,000〜" },
            { name: "初回限定プラン", desc: "カウンセリング込みスタートセット", price: "¥5,500〜" },
          ].map((menu) => (
            <div key={menu.name} style={{ background: "#fff", padding: "28px", textAlign: "left", border: "1px solid #EDE6D8" }}>
              <p style={{ fontWeight: 500, marginBottom: "8px", fontSize: "15px" }}>{menu.name}</p>
              <p style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>{menu.desc}</p>
              <p style={{ color: "#B8975A", fontWeight: 500, fontSize: "18px" }}>{menu.price}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section ref={addFadeRef} className="fade" style={{ padding: "88px 24px", textAlign: "center" }}>
        <p style={{ color: "#B8975A", fontSize: "11px", letterSpacing: "0.4em", marginBottom: "24px" }}>REVIEWS</p>
        <h2 style={{ fontFamily: "var(--font-noto-serif), serif", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 300, marginBottom: "16px" }}>お客様の声</h2>
        <p style={{ color: "#888", marginBottom: "48px" }}>Google Reviews ★4.71（117件）</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px", maxWidth: "900px", margin: "0 auto" }}>
          {[
            { name: "A.K様", stars: 5, text: "縮毛矯正が全然ダメージを感じない！こんなにサラサラになるとは思っていなかったです。" },
            { name: "M.T様", stars: 5, text: "カウンセリングがとても丁寧で、自分の髪質に合った提案をしてくれました。" },
            { name: "Y.S様", stars: 5, text: "3ヶ月通って髪の扱いやすさが全然違います。毎朝のスタイリングが楽になりました。" },
            { name: "R.O様", stars: 5, text: "他のサロンとは違う仕上がり。ツヤとまとまりが長続きします。リピート決定です！" },
          ].map((review) => (
            <div key={review.name} style={{ background: "#F8F4EE", padding: "24px", textAlign: "left" }}>
              <div style={{ color: "#B8975A", marginBottom: "8px" }}>{"★".repeat(review.stars)}</div>
              <p style={{ fontSize: "14px", lineHeight: 1.8, color: "#4A4A4A", marginBottom: "12px" }}>{review.text}</p>
              <p style={{ fontSize: "12px", color: "#888" }}>{review.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Access */}
      <section ref={addFadeRef} className="fade" style={{ background: "#EDE6D8", padding: "88px 24px", textAlign: "center" }}>
        <p style={{ color: "#B8975A", fontSize: "11px", letterSpacing: "0.4em", marginBottom: "24px" }}>ACCESS</p>
        <h2 style={{ fontFamily: "var(--font-noto-serif), serif", fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 300, marginBottom: "32px" }}>アクセス</h2>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "left" }}>
          <div style={{ marginBottom: "24px", fontSize: "14px", lineHeight: 2, color: "#4A4A4A" }}>
            <p><strong>Mys（ミース）</strong></p>
            <p>〒190-0023 東京都立川市柴崎町2丁目</p>
            <p>JR南武線 南立川駅 徒歩2分</p>
            <p>営業時間：10:00〜20:00（最終受付 18:00）</p>
            <p>定休日：火曜日・第2・4水曜日</p>
          </div>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.5!2d139.413!3d35.694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDQxJzM4LjQiTiAxMznCsDI0JzQ2LjgiRQ!5e0!3m2!1sja!2sjp!4v1"
            width="100%" height="300" style={{ border: 0, marginTop: "16px" }} loading="lazy"
            allowFullScreen referrerPolicy="no-referrer-when-downgrade"
            title="Mys サロン地図"
          />
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#1A1A1A", padding: "88px 24px", textAlign: "center" }}>
        <p style={{ color: "#D4B47A", fontSize: "11px", letterSpacing: "0.4em", marginBottom: "24px" }}>RESERVATION</p>
        <h2 style={{ fontFamily: "var(--font-noto-serif), serif", fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 300, color: "#fff", marginBottom: "16px" }}>
          まずは無料カウンセリングから
        </h2>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", marginBottom: "40px" }}>
          お気軽にご相談ください。あなたの髪の悩みを一緒に解決します。
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="https://beauty.hotpepper.jp/slnH000721782/" target="_blank" rel="noopener noreferrer"
            style={{ padding: "14px 36px", background: "#B8975A", color: "#fff", textDecoration: "none", fontSize: "13px", letterSpacing: "0.15em" }}>
            Hotpepper で予約
          </a>
          <a href="https://line.me/R/ti/p/@906kdphu" target="_blank" rel="noopener noreferrer"
            style={{ padding: "14px 36px", background: "#06C755", color: "#fff", textDecoration: "none", fontSize: "13px", letterSpacing: "0.15em" }}>
            LINE で予約
          </a>
        </div>
      </section>

      {/* AI Salon OS promo for B2B visitors */}
      <section style={{ background: "#0F0F1A", padding: "48px 24px", textAlign: "center" }}>
        <p style={{ color: "#B8975A", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "16px" }}>For Salon Owners</p>
        <p style={{ color: "#fff", fontFamily: "var(--font-noto-serif), serif", fontSize: "22px", fontWeight: 300, marginBottom: "12px" }}>
          この AI システム、あなたのサロンにも導入できます
        </p>
        <p style={{ color: "#888", fontSize: "13px", lineHeight: 1.8, marginBottom: "28px", maxWidth: "480px", margin: "0 auto 28px" }}>
          Mys が自社開発・自社実証した美容室特化 AI。MEO・SNS・リテンション・採用を全自動化。
        </p>
        <Link href="/ai-os"
          style={{ display: "inline-block", padding: "12px 32px", border: "1px solid #B8975A", color: "#B8975A", textDecoration: "none", fontSize: "12px", letterSpacing: "0.15em" }}>
          AI Salon OS を見る →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: "#111", padding: "32px 24px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-cormorant), serif", color: "#B8975A", fontSize: "18px", letterSpacing: "0.3em", marginBottom: "12px" }}>M Y S</p>
        <p style={{ color: "#555", fontSize: "12px" }}>© 2024 Mys. All rights reserved.</p>
        <Link href="/dashboard" style={{ color: "#333", fontSize: "11px", marginTop: "16px", display: "inline-block" }}>
          Staff Dashboard
        </Link>
      </footer>
    </div>
  );
}
