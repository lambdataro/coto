# koto
シンプルな静的サイトジェネレータ。

## 使い方

ディレクトリ `site` 内のMarkdownファイルを利用して静的サイトを作成し、ディレクトリ `www` に書き出す。

```sh
$ koto site www
```

設定ファイル `site.json` を元に静的サイトを作成し、ディレクトリ `www` に書き出す。

```sh
$ koto site.json www
```

## site.json

```json
{
  "title": "私のウェブサイト",
  "templatePath": "./template.ejs",
  "directories": [
    {
      "src": "site",
      "dst": ".",
      "convert": true
    },
    {
      "src": "include",
      "dst": "subdir",
      "convert": false
    }
  ]
}
```

### title
サイトのタイトルを指定します。
Markdown を変換した場合、ページのタイトルは `#` で最初に指定されたヘッダの中身になります。
設定で `title` を指定した場合は、ページタイトルの後ろにここで指定したサイトタイトルが追加されます。

例えば `"title": "私のウェブサイト"` で以下の文章を変換すると、出力されるタイトルは、
`タイトル - 私のウェブサイト` になります。

```markdown
# タイトル
本文
```

### templatePath
利用するejsテンプレートのパスを指定します。
省略した場合はコマンド内蔵のテンプレートが利用されます。
以下は `koto` で利用可能なejsテンプレートの例です。

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title><%= title %></title>
  </head>
  <body>
    <div class="markdown-body"><%- content %></div>
  </body>
</html>
```

### directories
サイトをどのように構成するかを指定します。
指定を省略すると、以下の設定が利用されます。

```markdown
[
  {
    "src": ".",
    "dst": ".",
    "convert": true,
    "overwrite": false
  }
]
```

`src` と `dst` はコマンドで指定した入力元と出力先からの相対パスを記述します。
`convert` に `false` を指定すると、Markdownの変換を行わずそのままコピーします。
`overwrite` に `true` を指定すると、既存の内容に変換結果を上書きします。
複数指定した場合は最初の物から順番に処理されます。
