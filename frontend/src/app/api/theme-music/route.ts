import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const sound = req.nextUrl.searchParams.get('sound');
  let targetFile = 'Critica Theme Song.mp3';
  let slugFile = 'critica-theme.mp3';

  if (sound === 'click') {
    targetFile = 'Clicking the select box.mp3';
    slugFile = 'clicking-select-box.mp3';
  } else if (sound === 'right' || sound === 'correct' || sound === 'right_answer') {
    targetFile = 'right answer.mp3';
    slugFile = 'right-answer.mp3';
  } else if (sound === 'wrong' || sound === 'incorrect') {
    targetFile = 'wrong.mp3';
    slugFile = 'wrong.mp3';
  } else if (sound === 'victory') {
    targetFile = 'Victory sound.mp3';
    slugFile = 'victory-sound.mp3';
  }

  const possiblePaths = [
    path.join(process.cwd(), 'src', 'components', 'dashboard', 'theme_music', targetFile),
    path.join(process.cwd(), 'src', 'app', 'dashboard', 'theme_music', targetFile),
    path.join(process.cwd(), 'public', 'theme_music', targetFile),
    path.join(process.cwd(), 'public', 'theme_music', slugFile),
  ];

  const filePath = possiblePaths.find(p => fs.existsSync(p));
  if (!filePath) {
    return new NextResponse('Audio file not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const nodeStream = fs.createReadStream(filePath, { start, end });
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', chunk => controller.enqueue(chunk));
        nodeStream.on('end', () => controller.close());
        nodeStream.on('error', err => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', chunk => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', err => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
