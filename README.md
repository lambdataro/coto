# coto
cotoはシンプルな静的サイトジェネレータです。
複数のMarkdownが含まれたディレクトリから静的サイトを生成できます。

## インストール

node.js (Version 6 以上) をインストールして `npm` コマンドでインストールします。

```
$ npm install -g coto
```

## 簡単な使い方

ディレクトリ `site` 内のMarkdownファイルを利用して静的サイトを作成し、
ディレクトリ `www` に書き出すには以下のように入力します。

```sh
$ coto site www
```

## 高度な使い方

設定ファイルを用意すると生成の方法をカスタマイズできます。
設定ファイル `site.json` を元に静的サイトを作成し、
ディレクトリ `www` に書き出すには以下のように入力します。

```sh
$ coto site.json www
```

## site.json

`site.json` を利用するとサイトのタイトル、利用するejsテンプレート、
ディレクトリ構造の操作、メニューの生成を利用できます。
以下はデフォルトの設定内容です。

### title
サイトのタイトルを指定します。
サイトのタイトルを指定すると、各ページのタイトルの後ろに指定したサイト名が追記されます。

例:
```json
{
  "title": "私のウェブサイト"
}
```

### templatePath
Markdown を埋め込む ejs テンプレートを指定します。

例:
```json
{
  "templatePath": "./template.ejs"
}
```

### directories
変換するフォルダと変換結果の出力先を複数指定できます。
複数指定すると順番に処理が行われます。
デフォルトでは以下が指定されています。

```json
{
  "directories": [
    {
      "src": ".",
      "dst": ".",
      "convert": true,
      "overwrite": false
    }
  ]
}
```

`src` と `dst` を変えると入出力の対象となるディレクトリを変更できます。
`convert` を `false` にすると、Markdown の変換が行われなくなります。
`overwrite` を `true` にすると、変換前のディレクトリクリアが行われなくなります。

### menuitems
トップのメニューの作り方を配列で指定します。

単純なリンクを作成する場合は、以下のように名前とURLを指定します。

```json
{
  "name": "Google",
  "link": "https://www.google.co.jp"
}
```

ドロップダウンリンクを作成するには、以下のように記述します。

```json
{
  "name": "リンク集",
  "type": "list",
  "items": [
    {
      "name": "Google",
      "link": "https://www.google.co.jp/"
    },
    {
      "name": "Yahoo!",
      "link": "http://www.yahoo.co.jp/"
    }
  ]
}
```

`name` に `"----"` を指定すると水平線を作成できます。

変換するMarkdownから自動で作成するには、以下のように記述します。

```json
{
  "name": "記事",
  "type": "auto",
  "index": 0
}
```

`index` は `directories` で指定した変換規則のインデックス (`0` ベース) です。

## 具体例
リポジトリの `test` ディレクトリ以下に例があります。
