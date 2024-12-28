// fetchAndParseHtml.mjs
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { promisify } from 'util';
import path from 'node:path';
import fs from 'fs';
import { pipeline } from 'stream';
import { promises as fsPromises } from 'node:fs';

const HTML_URL = 'https://wiki.biligame.com/ys/%E5%8F%AF%E8%8E%89%E8%AF%AD%E9%9F%B3';
const SUBTITLES_FILE_PATH_PREFIX = "output/youxi/keli/denoise_opt/"
const DOWNLOAD_FILE_PATH = "/mnt/d/tts/youxi/keli"


const downloadAudio = async (url, filepath) => {
    try {
        // 发送请求获取视频资源
        const response = await fetch(url);

        // 如果响应状态码不是200，抛出错误
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status}${response.statusText}`);
        }

        // 创建一个可写流，用于将视频数据写入文件
        const fileStream = fs.createWriteStream(filepath);
        const pipelineAsync = promisify(pipeline);

        // 使用pipeline将响应流传输到文件流
        await pipelineAsync(response.body, fileStream);

    } catch (error) {
        console.error('Error downloading the audio:', error);
    }
};

async function writeToFile(filename, content) {
    try {
        // 写入文件
        await fsPromises.writeFile(filename, content);
    } catch (err) {
        console.error('写入文件时出错:', err);
    }
}
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`Directory created: ${dirPath}`);
    }
}


const main = async (dir, subtitlesFilePathPrefix, url) => {
    const audioDir = path.join(dir, "audio");
    const subtitlesDir = path.join(dir, "subtitles");
    ensureDirectoryExistence(audioDir);
    ensureDirectoryExistence(subtitlesDir);

    let html;
    try {
        const response = await fetch(url);
        html = await response.text();
    } catch (err) {
        console.error('请求出错:', err)
    }
    const $ = cheerio.load(html);
    const visibleMdDivs = $('.resp-tabs-container > .resp-tab-content');
    const visibleMdDivsArray = visibleMdDivs.first().children().toArray();
    let index = 1;
    let subtitles = "";
    for (const element of visibleMdDivsArray) {
        // 输出每个元素的 HTML 内容
        const item = $(element).children().first().children();
        let audioSrc = item.eq(1).children().first().attr("data-src");
        if (audioSrc?.length > 0) {
            const fileName = index < 10 ? "0" + index + ".ogg" : index + ".ogg";
            await downloadAudio(audioSrc, path.join(audioDir, fileName));
            subtitles += `${subtitlesFilePathPrefix}${fileName}|denoise_opt|ZH|${item.eq(5).children().first().text()}\n`
            index++;
        }
    }
    await writeToFile(path.join(subtitlesDir, "denoise_opt.list"), subtitles)
}
await main(
    DOWNLOAD_FILE_PATH,
    SUBTITLES_FILE_PATH_PREFIX,
    HTML_URL,
);

