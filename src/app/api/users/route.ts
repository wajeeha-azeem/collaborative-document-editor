import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/request-user";

export async function GET(request: Request) {
  const result = await requireUserId(request);

  if ("error" in result) {
    return result.error;
  }

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return NextResponse.json({
    users: users.filter((user) => user.id !== result.user.id),
  });
}
