# Codex入門講座

Codexアプリを使ったAIエージェント入門講座サイトです。

## 構成

- `index.html`: 受講者向けサイト
- `admin/index.html`: コンテンツ編集画面
- `data/course.json`: Firestoreが空の場合の初期表示データ
- `assets/app.js`: 受講者向けサイトの描画
- `assets/admin.js`: コンテンツ編集画面
- `assets/firebase-client.js`: Firebase接続処理
- `assets/firebase-config.js`: Firebase Web設定
- `assets/styles.css`: 共通スタイル
- `firestore.rules`: Firestoreのアクセス制御

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
2. Googleでログインする
3. `レッスンを下書き保存` または `下書き保存` でFirestoreの下書きへ保存する
4. `下書きをプレビュー` で表示を確認する
5. `公開する` で表示状態が `表示する` のレッスンを受講者向けサイトへ反映する

## Firebase

- Project ID: `codex-course-20260613`
- Plan: Spark
- Firestore: `courses/draft` と `courses/public`
- Authentication: Google
- 管理者: `firestore.rules` の `isAdmin()` に記載されたメールアドレス

管理画面の保存先:

- 下書き保存: `courses/draft`
- 公開: `courses/public`

受講者向けサイトは `courses/public` を読み込みます。Firestoreが空、または読み込みに失敗した場合だけ `data/course.json` を読みます。
