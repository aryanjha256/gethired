import { NextResponse } from "next/server";
import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";

import { isAllowedEmail } from "@/lib/auth";

const isSignInRoute = createRouteMatcher(["/sign-in(.*)"]);
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/not-authorized"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!userId) {
    if (isPublicRoute(req)) return NextResponse.next();
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const allowed = isAllowedEmail(user.primaryEmailAddress?.emailAddress);

  if (isSignInRoute(req)) {
    return NextResponse.redirect(
      new URL(allowed ? "/" : "/not-authorized", req.url),
    );
  }

  if (!allowed) {
    if (req.nextUrl.pathname === "/not-authorized") return NextResponse.next();
    return NextResponse.redirect(new URL("/not-authorized", req.url));
  }

  if (req.nextUrl.pathname === "/not-authorized") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
