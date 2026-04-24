import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');
const BACKUP_DIR = path.join(process.cwd(), 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getBackups() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return files;
}

// GET — list backups or download one
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const download = searchParams.get('download');

  if (download) {
    const filePath = path.join(BACKUP_DIR, path.basename(download));
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Backup hittades inte' }, { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(download)}"`,
      },
    });
  }

  return NextResponse.json(getBackups());
}

// POST — create a new backup
export async function POST() {
  try {
    ensureBackupDir();

    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Databasen hittades inte' }, { status: 404 });
    }

    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupName = `backup-${ts}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    fs.copyFileSync(DB_PATH, backupPath);

    // Keep only the last 30 backups
    const all = getBackups();
    if (all.length > 30) {
      all.slice(30).forEach(b => {
        try { fs.unlinkSync(path.join(BACKUP_DIR, b.name)); } catch {}
      });
    }

    const stat = fs.statSync(backupPath);
    return NextResponse.json({
      name: backupName,
      size: stat.size,
      createdAt: stat.mtime.toISOString(),
      message: 'Backup skapad',
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Kunde inte skapa backup: ' + error.message }, { status: 500 });
  }
}

// DELETE — remove a backup
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'Filnamn krävs' }, { status: 400 });

  const filePath = path.join(BACKUP_DIR, path.basename(name));
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Filen hittades inte' }, { status: 404 });
  }
  fs.unlinkSync(filePath);
  return NextResponse.json({ message: 'Backup raderad' });
}
