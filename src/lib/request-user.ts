import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { USER_ID_HEADER } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { USER_ID_COOKIE } from "@/lib/user-session";

type DemoUser = {
  id: string;
  name: string;
};

export async function resolveUserId(
  request?: Request,
): Promise<string | null> {
  const headerId = request?.headers.get(USER_ID_HEADER)?.trim();

  if (headerId) {
    return headerId;
  }

  const cookieStore = await cookies();
  const cookieId = cookieStore.get(USER_ID_COOKIE)?.value;

  if (!cookieId) {
    return null;
  }

  try {
    return decodeURIComponent(cookieId).trim() || null;
  } catch {
    return cookieId.trim() || null;
  }
}

export async function getSessionUser(
  request?: Request,
): Promise<DemoUser | null> {
  const userId = await resolveUserId(request);

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
}

export async function requireUserId(request: Request) {
  const user = await getSessionUser(request);

  if (!user) {
    const userId = await resolveUserId(request);

    if (!userId) {
      return {
        error: NextResponse.json(
          { error: "Missing user. Select a demo user first." },
          { status: 401 },
        ),
      };
    }

    return {
      error: NextResponse.json(
        { error: "Selected user was not found. Pick a user again." },
        { status: 401 },
      ),
    };
  }

  return { user };
}
