import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const transactionId = formData.get('transactionId') as string;

    if (!file) {
      return NextResponse.json({ error: 'Ingen fil uppladdad' }, { status: 400 });
    }

    // Validera filtyp (endast PDF och bilder)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Endast PDF, JPG och PNG-filer tillåtna'
      }, { status: 400 });
    }

    // Validera filstorlek (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Filen får max vara 10MB'
      }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generera unikt filnamn
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const filename = `${timestamp}_${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

    // Spara fil
    await writeFile(filepath, buffer);

    // Spara metadata i databas
    const attachment = await prisma.attachment.create({
      data: {
        transactionId: parseInt(transactionId),
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      attachment
    }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: 'Kunde inte ladda upp fil'
    }, { status: 500 });
  }
}

// DELETE - Ta bort bilaga
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID saknas' }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: parseInt(id) },
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Bilaga hittades inte' }, { status: 404 });
    }

    // Ta bort fil från disk
    const filepath = path.join(process.cwd(), 'public', 'uploads', attachment.filename);
    try {
      const { unlink } = await import('fs/promises');
      await unlink(filepath);
    } catch (err) {
      console.error('Could not delete file:', err);
    }

    // Ta bort från databas
    await prisma.attachment.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({
      error: 'Kunde inte ta bort bilaga'
    }, { status: 500 });
  }
}
