import { NextResponse } from "next/server";

import { USER_ID_HEADER } from "@/lib/documents";
import { prisma } from "@/lib/prisma";

export async function requireUserId(request: Request) {
  const userId = request.headers.get(USER_ID_HEADER)?.trim();

  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "Missing user. Select a demo user first." },
        { status: 401 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Selected user was not found. Pick a user again." },
        { status: 401 },
      ),
    };
  }

  return { user };
}
