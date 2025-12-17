import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Hämta alla anteckningar
export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      orderBy: [
        { isCompleted: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Kunde inte hämta anteckningar' },
      { status: 500 }
    );
  }
}

// POST - Skapa ny anteckning
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, priority } = body;

    const note = await prisma.note.create({
      data: {
        title,
        content,
        priority: priority || 'NORMAL',
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Kunde inte skapa anteckning' },
      { status: 500 }
    );
  }
}

// PUT - Uppdatera anteckning
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, content, priority, isCompleted } = body;

    const note = await prisma.note.update({
      where: { id },
      data: {
        title,
        content,
        priority,
        isCompleted,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Kunde inte uppdatera anteckning' },
      { status: 500 }
    );
  }
}

// DELETE - Radera anteckning
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID saknas' }, { status: 400 });
    }

    await prisma.note.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Kunde inte radera anteckning' },
      { status: 500 }
    );
  }
}
