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
2. `レッスンを下書き保存` または `下書き保存` でブラウザ内に保存する
3. `下書きをプレビュー` で表示を確認する
4. `公開用JSONを書き出す` で `course.json` を保存する
5. 次のコマンドでサイトデータへ反映してGitHubへ送る

```powershell
.\scripts\Publish-CourseData.ps1 -CourseJson "$env:USERPROFILE\Downloads\course.json"
```

管理画面で追加しただけでは、公開サイトの `data/course.json` は変わりません。
