const fs = require("fs-extra");
const path = require("path");
const ejs = require("ejs");
const marked = require("marked");

export function main() {
  setupMarked();

  if (process.argv.length !== 4) {
    console.log("使い方: koto [ソースディレクトリ] [出力ディレクトリ}");
    exit(1);
  }

  convertDir(process.argv[2], process.argv[3])
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
    renderer,
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: false
  });
}

/**
 * ディレクトリ内のMarkdownをHTMLに変換する。
 */
async function convertDir(baseDir, outDir) {
  await emptyDir(outDir);
  const files = await listFiles(baseDir);
  for (let filename of files) {
    if (path.extname(filename) === ".md") {
      await convertFile(filename, baseDir, outDir);
    } else {
      await copy(
        filename,
        path.join(process.cwd(), outDir, path.relative(baseDir, filename))
      );
    }
  }
}

/**
 * MarkdownをHTMLに変換する。
 */
async function convertFile(filename, baseDir, outDir) {
  const mdText = await readFile(filename, "utf8");
  const templatePath = path.resolve(__dirname, "..", "assets", "default.ejs");
  const template = await readFile(templatePath, "utf8");
  const title = mdText.match(/#+([^#\n]+)/)[1].trim();
  const content = marked(mdText);
  const htmlText = fixLinks(ejs.render(template, {title, content}));
  const relpath = path.relative(baseDir, filename);
  const outFilename = path.join(process.cwd(), outDir, path.basename(relpath, ".md") + ".html");
  await writeFile(outFilename, htmlText, {encoding: "utf8"});
}

/**
 * aタグ内の拡張子.mdを.htmlに変換する。
 */
function fixLinks(htmlText) {
  return htmlText.replace(
    /<a href=\"(?:\w|-|\.|\/)+(\.md)\">/g,
    str => str.replace(/\.md/, ".html")
  );
}

/**
 * 指定したディレクトリ以下のファイルを列挙する。
 */
async function listFiles(dirname) {
  const result = [];
  let files = [dirname];
  while (files.length > 0) {
    const filepath = files.pop();
    const stats = await fsStat(filepath);
    if (stats.isDirectory()) {
      const newfiles = (await readDir(dirname))
        .map(filename => path.join(dirname, filename));
      files = files.concat(newfiles);
    } else if (stats.isFile()) {
      result.push(filepath);
    }
  }
  return result;
}

// Promise化したfs関数。
const readFile = fromNode(fs.readFile.bind(fs));
const writeFile = fromNode(fs.writeFile.bind(fs));
const readDir = fromNode(fs.readdir.bind(fs));
const fsStat = fromNode(fs.stat.bind(fs));
const copy = fromNode(fs.copy.bind(fs));
const emptyDir = fromNode(fs.emptyDir.bind(fs));

/**
 * nodeの関数をpromise化する。
 */
function fromNode(f) {
  return (...args) =>
    new Promise((resolve, reject) =>
      f(...args, (err, data) => err ? reject(err) : resolve(data))
    );
}
