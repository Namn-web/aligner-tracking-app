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
  --bg:           #ECEAE4;   /* ページ背景（ウォームグレー） */
  --card-bg:      #FFFFFF;   /* カード背景 */
  --text:         #1C1C1C;   /* メインテキスト */
  --text-soft:    #8A8A8A;   /* サブテキスト・ラベル */
  --border:       #E0DDD6;   /* ボーダー・区切り線 */

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
フォントファミリー: "Hiragino Sans", "Yu Gothic UI", -apple-system, sans-serif
```

| 用途 | サイズ | ウェイト | 備考 |
|---|---|---|---|
| 大きな数値（装着時間） | 40px | 800 | letter-spacing: -0.02em |
| ページタイトル（h1） | 17px | 700 | |
| カードタイトル（h2） | 16px | 700 | |
| 本文・ボタン | 14px | 600 | |
| ラベル（UPPERCASE） | 11px | 700 | letter-spacing: 0.07em |
| サブテキスト | 12–13px | 400–600 | color: --text-soft |

---

## シャドウ

```css
--shadow-sm: 0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03);
--shadow:    0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
--shadow-lg: 0 8px 28px rgba(0,0,0,0.12);
```

| クラス | 使う場面 |
|---|---|
| `--shadow-sm` | Q&Aアコーディオン、小さいコンポーネント |
| `--shadow` | 通常カード（`.card`） |
| `--shadow-lg` | ドロップダウンメニュー |

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

## アイコン・絵文字

| 用途 | 使用 |
|---|---|
| 装着中トグル | 🦷 |
| 外しているトグル | ✋ |
| 達成バッジ | ✓ |
| 警告・アラート | ⚠️ |
| 交換可能 | ✅ |
| 設定メニュー | ⚙️ |
| Q&Aメニュー | 💬 |

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

*最終更新: 2026-07-04*
