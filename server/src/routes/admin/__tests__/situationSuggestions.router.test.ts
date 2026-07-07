/** @jest-environment node */

/**
 * Verifies the Situation Suggestions admin router is actually gated by
 * requireAuth + requireRole("admin") on all three endpoints — the same
 * concern as "Non-admin users cannot access these endpoints" — by inspecting
 * the real Express route stack and exercising the exact middleware instances
 * wired into it (not just the shared requireRole factory in isolation).
 */

// The router transitively imports @/config/firebase via the service layer —
// mock it so the test never touches real Firebase Admin.
jest.mock("@/config/firebase", () => ({
  admin: { firestore: { Timestamp: { now: () => "MOCK_TIMESTAMP" } } },
  firestore: { collection: jest.fn() },
  db: { collection: jest.fn() },
}));

import type { Request, Response } from "express";
import router from "../situationSuggestions.router";

interface ExpressRouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: (req: Request, res: Response, next: () => void) => void }>;
  };
}

function findRoute(path: string, method: "get" | "post") {
  const layer = (router as unknown as { stack: ExpressRouteLayer[] }).stack.find(
    (l) => l.route?.path === path && l.route?.methods[method],
  );
  if (!layer?.route) {
    throw new Error(`Route not found in router: ${method.toUpperCase()} ${path}`);
  }
  return layer.route;
}

function mockRes(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

function fakeUserReq(role: string): Request {
  return { user: { uid: "u1", email: "u1@example.com", role, displayName: "U1" } } as unknown as Request;
}

const ROUTES: Array<["/" | "/:templateId/approve" | "/:templateId/reject", "get" | "post"]> = [
  ["/", "get"],
  ["/:templateId/approve", "post"],
  ["/:templateId/reject", "post"],
];

describe("situationSuggestions.router — admin-only gating", () => {
  test.each(ROUTES)("%s %s: requireAuth runs first in the middleware chain", (path, method) => {
    const route = findRoute(path, method);
    expect(route.stack[0]!.handle.name).toBe("requireAuth");
  });

  test.each(ROUTES)("%s %s: the role gate rejects a non-admin (specialist) with 403", (path, method) => {
    const route = findRoute(path, method);
    const roleMiddleware = route.stack[1]!.handle;
    const res = mockRes();
    const next = jest.fn();

    roleMiddleware(fakeUserReq("specialist"), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test.each(ROUTES)("%s %s: the role gate rejects a caregiver with 403", (path, method) => {
    const route = findRoute(path, method);
    const roleMiddleware = route.stack[1]!.handle;
    const res = mockRes();
    const next = jest.fn();

    roleMiddleware(fakeUserReq("caregiver"), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test.each(ROUTES)("%s %s: the role gate lets an admin through", (path, method) => {
    const route = findRoute(path, method);
    const roleMiddleware = route.stack[1]!.handle;
    const res = mockRes();
    const next = jest.fn();

    roleMiddleware(fakeUserReq("admin"), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test.each(ROUTES)("%s %s: has exactly three handlers (auth, role, route handler)", (path, method) => {
    const route = findRoute(path, method);
    expect(route.stack).toHaveLength(3);
  });
});
