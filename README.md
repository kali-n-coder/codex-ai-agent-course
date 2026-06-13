# Codex入門講座

Codexアプリを使ったAIエージェント入門講座サイトです。

## 構成

- `index.html`: 公開サイト
- `admin/index.html`: 講座・動画管理画面
- `data/course.json`: 公開データ
- `assets/app.js`: 公開サイト描画
- `assets/admin.js`: 管理画面
- `assets/styles.css`: 共通スタイル

## ローカル確認

静的サイトなので、任意のHTTPサーバーで確認できます。

```powershell
python -m http.server 4321
```

URL:

```text
http://127.0.0.1:4321/
http://127.0.0.1:4321/admin/
```

## 動画公開フロー

1. `/admin/` でレッスンを登録する
2. OBSで録画する
3. YouTubeに限定公開でアップロードする
4. 対象レッスンに動画URLを入れる
5. 公開状態を `公開中` にする
6. `公開データを書き出す` で `course.json` をダウンロードする
7. `data/course.json` を置き換えてデプロイする

## 無料公開

GitHub PagesやCloudflare Pagesなど、静的ホスティングで公開できます。

現状の管理画面は、無料運用向けの静的エディタです。公開サイトには `published` のレッスンだけが表示されます。

管理画面から本番データへ直接保存したい場合は、次段階でCloudflare Pages Functions、GitHub API、Supabaseなどを追加します。
