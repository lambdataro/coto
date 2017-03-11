const fs = require("fs-extra");
const path = require("path");
const ejs = require("ejs");
const marked = require("marked");

export function main() {
  setupMarked();

  if (process.argv.length !== 4) {
    console.log("使い方: koto [ディレクトリ|設定ファイル] [出力先]");
    process.exit(1);
  }

  (async function () {
    const arg2 = path.join(process.cwd(), process.argv[2]);
    const stats = await fsStat(arg2);
    const config = stats.isDirectory() ? {} : JSON.parse(await readFile(arg2));
    const base = stats.isDirectory() ? arg2 : path.dirname(arg2);
    const out = path.join(process.cwd(), process.argv[3]);
    const ctx = await makeInitContext(config, out);
    await createMenu(ctx, base, out);
    for (let i = 0; i < ctx.directories.length; i++) {
      const entry = ctx.directories[i];
      const baseDir = path.join(base, entry.src);
      const outDir = path.join(out, entry.dst);
      if (!entry.overwrite) await emptyDir(outDir);
      if (entry.convert) {
        await convertDir(ctx, baseDir, outDir);
      } else {
        await copy(baseDir, outDir);
      }
    }
  }())
  .then(() => console.log("完了"))
  .catch(err => {
    console.error(err);
    exit(1);
  }); 
}

/**
 * markedの設定。
 */
function setupMarked() {
  const renderer = new marked.Renderer();
  renderer.heading = (text, level) => `<h${level}>${text}</h${level}>`;
  marked.setOptions({
    renderer
  });
}

/**
 * 初期文脈を作る
 */
async function makeInitContext(config, base) {
  const ctx = {};
  ctx.title = readStringProperty(config, "title");
  ctx.base = base;
  ctx.templatePath = readStringProperty(config, "templatePath", 
    path.join(__dirname, "..", "assets", "default.ejs")
  );
  ctx.templateText = await readFile(ctx.templatePath, "utf8");
  if (config.directories) {
    ctx.directories = config.directories.map(entry => {
      return {
        src: readStringProperty(entry, "src", "."),
        dst: readStringProperty(entry, "dst", "."),
        convert: typeof entry.convert === "boolean" ? entry.convert : true,
        overwrite: typeof entry.overwrite === "boolean" ? entry.overwrite : false
      };
    });
  } else {
    ctx.directories = [{
      src: "./",
      dst: "./",
      convert: true,
      overwrite: false
    }];
  }
  ctx.menuitems = config.menuitems ||
    [
      {
        name: "記事",
        type: "auto",
        index: 0
      }
    ];
  return ctx;
}

/**
 * 文字列プロパティの読み取り。
 */
function readStringProperty(obj, propertyName, defalutValue = "") {
  return typeof obj[propertyName] === "string" ? obj[propertyName] : defalutValue
}

/**
 * メニューを作る。
 */
async function createMenu(ctx, baseDir, outDir) {
  for (let i = 0; i < ctx.menuitems.length; i++) {
    if (ctx.menuitems[i].type === "auto") {
      const items = [];
      const entry = ctx.directories[ctx.menuitems[i].index];
      const srcDir = path.join(baseDir, entry.src);
      const files = (await readDir(srcDir)).map(name => path.join(srcDir, name));
      for (let j = 0; j < files.length; j++) {
        if (path.extname(files[j]) === ".md") {
          const relpath = path.relative(srcDir, files[j]);
          const outpath = path.join(outDir, entry.dst, path.dirname(relpath), 
            path.basename(relpath, ".md") + ".html"
          );
          const mdText = await readFile(files[j], "utf8");
          items.push({
            name: await extractPageTitle({ title: "" }, marked.lexer(mdText)),
            link: path.relative(outDir, outpath)
          });
        }
      }
      ctx.menuitems[i].items = items;
    }
  }
}

/**
 * ディレクトリ内のMarkdownをHTMLに変換する。
 */
async function convertDir(ctx, baseDir, outDir) {
  const files = await listFiles(baseDir);
  for (let filename of files) {
    if (path.extname(filename) === ".md") {
      await convertFile(filename, ctx, baseDir, outDir);
    } else {
      await copy(
        filename,
        path.join(outDir, path.relative(baseDir, filename))
      );
    }
  }
}

/**
 * MarkdownをHTMLに変換する。
 */
async function convertFile(filename, ctx, baseDir, outDir) {
  const mdText = await readFile(filename, "utf8");
  const tokens = marked.lexer(mdText);
  const content = marked.parser(tokens);
  const pagetitle = await extractPageTitle(ctx, tokens);
  const relpath = path.relative(baseDir, filename);
  const outFilename = path.join(outDir, path.dirname(relpath), path.basename(relpath, ".md") + ".html");
  const basepath = path.dirname(path.relative(outFilename, ctx.base));
  const htmlText = ejs.render(ctx.templateText, {
    sitename: ctx.title,
    basepath,
    title: pagetitle,
    menuitems: ctx.menuitems,
    content: fixLinks(content, str => {
      return path.relative(ctx.base, path.join(path.dirname(outFilename), str))
    })
  });
  await outputFile(outFilename, htmlText, { encoding: "utf8" });
}

/**
 * ページタイトルを決定
 */
async function extractPageTitle(ctx, tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "heading" && token.depth === 1) {
      return ctx.title === "" ? token.text : `${token.text} - ${ctx.title}`;
    }
  }
  return ctx.title;
}

/**
 * aタグ内の拡張子.mdを.htmlに変換する。
 */
function fixLinks(htmlText, pathConverter) {
  return htmlText.replace(
    /href=\"(?:\w|-|\.|\/)+(\.md)\"/g,
    str => str.replace(/.md\"/, ".html\"")
  ).replace(
    /(?:href|src)=\"(\w|-|\.|\/)+"/g,
    str => str.indexOf("://") === -1 ?
      str.replace(/\"(\w|-|\.|\/)+\"/,
        s => `"${pathConverter(s.substring(1, s.length - 1))}"`) :
      str
  );
}

/**
 * 指定したディレクトリ以下のファイルを列挙する。
 */
async function listFiles(dirName) {
  const result = [];
  let files = [dirName];
  while (files.length > 0) {
    const filePath = files.pop();
    const stats = await fsStat(filePath);
    if (stats.isDirectory()) {
      const newFiles = (await readDir(filePath))
        .map(name => path.join(filePath, name));
      files = files.concat(newFiles);
    } else if (stats.isFile()) {
      result.push(filePath);
    }
  }
  return result;
}

// Promise化したfs関数。
const readFile = fromNode(fs.readFile.bind(fs));
const outputFile = fromNode(fs.outputFile.bind(fs));
const readDir = fromNode(fs.readdir.bind(fs));
const fsStat = fromNode(fs.stat.bind(fs));
const copy = fromNode(fs.copy.bind(fs));
const emptyDir = fromNode(fs.emptyDir.bind(fs));

/**
 * nodeの関数をpromise化する。
 */
function fromNode(f) {
  return (...args) =>
    new Promise((join, reject) =>
      f(...args, (err, data) => err ? reject(err) : join(data))
    );
}
