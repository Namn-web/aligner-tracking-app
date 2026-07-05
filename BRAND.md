# ブランドキット — アライナー管理アプリ

## アプリ概要

| 項目 | 内容 |
|---|---|
| アプリ名 | マウスピース管理（aligner-tracking-app） |
| 用途 | インビザライン装着時間・ステージ管理 |
| ターゲット | 矯正治療中の個人ユーザー |
| プラットフォーム | PWA（スマートフォン主体） |

---

## カラートークン

```css
:root {
  /* ベース */
  --bg:           #DDD9D2;   /* ページ背景（ウォームグレー） */
  --card-bg:      #FFFFFF;   /* カード背景 */
  --text:         #33312D;   /* メインテキスト（ウォームチャコール） */
  --text-soft:    #8C8880;   /* サブテキスト・ラベル */
  --border:       #C8C4BC;   /* ボーダー・区切り線 */

  /* プライマリ（ティール） */
  --primary:      #4CBFD8;   /* メインアクション・装着中状態 */
  --primary-deep: #2FA8C4;   /* ホバー・ダーク variant */
  --primary-light:#D6F3FA;   /* 薄い背景（チェックリスト現在進行） */

  /* グリーン（達成・成功） */
  --green:        #4DC99A;   /* 目標達成・完了ドット */
  --green-deep:   #2EB07E;   /* 達成テキスト */
  --green-light:  #D4F5E8;   /* 達成行の背景 */

  /* ピーチ（警告・外し中・不足） */
  --peach:        #F5C5A8;
  --peach-deep:   #E09070;   /* 警告テキスト・不足表示 */
  --peach-light:  #FDEEE6;   /* 警告行の背景 */
}
```

### 色の使い分けルール

| 色 | 使う場面 |
|---|---|
| `--primary` ティール | 装着中トグル、CTAボタン（交換・通知）、進捗リング |
| `--green` グリーン | 目標達成、7日ドット達成、履歴バッジ✓ |
| `--peach-deep` ピーチ | 装着不足の警告、外し中ステータス、累計不足テキスト |
| `--bg` グレー | ページ背景、入力フィールド背景、リスト行背景 |

---

## タイポグラフィ

```
フォントファミリー: "Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Yu Gothic UI", -apple-system, sans-serif
```

丸ゴシック（Zen Maru Gothic / Google Fonts）を採用。クレイモーフィズムの丸みと調和させる。
ウェイトは 500（本文）／700（強調・ボタン）／900（見出し・大きな数値）の3段階のみ使用する。
数値表示には `font-variant-numeric: tabular-nums` を指定し、桁の揺れを防ぐ。

| 用途 | サイズ | ウェイト | 備考 |
|---|---|---|---|
| 大きな数値（装着時間） | 40px | 800 | letter-spacing: -0.02em |
| ページタイトル（h1） | 17px | 700 | |
| カードタイトル（h2） | 16px | 700 | |
| 本文・ボタン | 14px | 600 | |
| ラベル（UPPERCASE） | 11px | 700 | letter-spacing: 0.07em |
| サブテキスト | 12–13px | 400–600 | color: --text-soft |

---

## シャドウ（クレイモーフィズム）

```css
/* 浮き上がり（凸） */
--clay-light: rgba(255, 255, 255, 0.78);   /* 左上ハイライト */
--clay-dark:  rgba(63, 55, 43, 0.18);      /* 右下シャドウ（ウォーム系） */

/* 押し込み（凹）：入力フィールド・溝・アクティブ状態 */
--clay-pressed:
  inset 3px 3px 7px rgba(63, 55, 43, 0.16),
  inset -2px -2px 5px rgba(255, 255, 255, 0.6);
```

| パターン | 使う場面 |
|---|---|
| 凸（外側ダーク＋ライト） | カード、ボタン、バッジ、ドット |
| 凹（インセット） | 入力フィールド、プログレスバーの溝、セレクター背景、履歴カード |
| ボタン`:active` | 凸→凹に切り替え＋`translateY(1px) scale(0.985)`で「押し込み」を表現 |

シャドウの黒は純黒でなく `rgba(63,55,43,…)`（ウォームブラウン）を使い、背景の暖色と馴染ませる。

---

## 角丸（Border Radius）

| 値 | 使う場面 |
|---|---|
| `999px` | ピル型バッジ・ボタン（元に戻す、戻るボタン） |
| `18px` | カード |
| `14px` | Q&Aアイテム、アラートバナー |
| `12px` | アクションボタン（交換した、リセット） |
| `10px` | 入力フィールド、リスト行、小ボタン |
| `50%` | トグルボタン（円形） |

---

## コンポーネントパターン

### カード
```css
background: #FFFFFF;
border-radius: 18px;
padding: 20px;
box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
border: 1px solid rgba(0,0,0,0.04);
```

### プライマリボタン
```css
background: var(--primary);   /* #4CBFD8 */
color: #FFFFFF;
border: none;
border-radius: 12px;
padding: 14px;
font-weight: 700;
```

### ゴーストボタン（危険系）
```css
background: transparent;
border: 1px solid var(--peach-deep);
color: var(--peach-deep);
border-radius: 10px;
```

### ラベル（SECTION TITLE）
```css
font-size: 11px;
font-weight: 700;
letter-spacing: 0.07em;
text-transform: uppercase;
color: var(--text-soft);
```

### 入力フィールド
```css
background: var(--bg);        /* #ECEAE4 */
border: 1px solid var(--border);
border-radius: 10px;
padding: 10px 12px;
/* フォーカス時 */
border-color: var(--primary);
```

---

## 状態別カラーマッピング

| 状態 | 背景 | テキスト |
|---|---|---|
| 達成・完了 | `--green-light` `#D4F5E8` | `--green-deep` `#2EB07E` |
| 警告・不足 | `--peach-light` `#FDEEE6` | `--peach-deep` `#E09070` |
| 進行中（今日） | `--primary-light` `#D6F3FA` | `--primary` `#4CBFD8` |
| 未着手 | `--bg` `#ECEAE4` | `--text-soft` `#8A8A8A` |

---

## アイコン

**絵文字は使わない**（OS依存で見た目が変わり、安っぽく見えるため）。インラインSVGで統一する。

| 用途 | 使用 |
|---|---|
| ロゴマーク・装着中トグル | 歯のSVG（`.logo-mark` / `.icon-tooth`） |
| 外しているトグル | マウスピースケースのSVG（`.icon-case`） |
| 設定メニュー | 歯車のSVG（stroke 1.6） |
| Q&Aメニュー | 吹き出しのSVG（stroke 1.6） |
| 達成・チェック | テキスト「✓」（グリーンで着色） |
| 状態の警告・成功 | アイコンではなくバナーの背景色で伝える |

---

## ファイル構成

```
kyousei/
├── index.html      メイン画面・設定ページ・QAページ
├── style.css       全スタイル（このBRAND.mdと対応）
├── app.js          ロジック・状態管理
├── manifest.json   PWA設定
├── icon.svg        アプリアイコン（ティールの歯）
└── BRAND.md        このファイル
```

---

*最終更新: 2026-07-05*
