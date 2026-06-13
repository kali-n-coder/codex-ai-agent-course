# Codex入門講座

Codexアプリを使ったAIエージェント入門講座サイトです。

## 構成

- `index.html`: 受講者向けサイト
- `admin/index.html`: コンテンツ編集画面
- `data/course.json`: サイトデータ
- `assets/app.js`: 受講者向けサイトの描画
- `assets/admin.js`: コンテンツ編集画面
- `assets/styles.css`: 共通スタイル

## ローカル確認

```powershell
python -m http.server 4321
```

```text
http://127.0.0.1:4321/
http://127.0.0.1:4321/admin/
```

## コンテンツ更新

1. `/admin/` でサイト情報やレッスンを編集する
2. `データを書き出す` で `course.json` を保存する
3. `data/course.json` を置き換える
4. 変更を反映する
