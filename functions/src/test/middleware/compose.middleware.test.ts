import { Request, Response, NextFunction } from "express";
import {
  composeMiddleware,
  conditionalMiddleware,
  pathMiddleware,
} from "../../middleware/compose.middleware";

describe("Middleware Composition", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      path: "",
    };
    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  it("should compose multiple middleware functions", async () => {
    const middleware1 = jest.fn((req: Request, res: Response, next: NextFunction) => next());
    const middleware2 = jest.fn((req: Request, res: Response, next: NextFunction) => next());

    const composed = composeMiddleware(middleware1, middleware2);
    await composed(mockReq as Request, mockRes as Response, mockNext);

    expect(middleware1).toHaveBeenCalled();
    expect(middleware2).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle errors in middleware", async () => {
    const error = new Error("Test error");
    const middleware = jest.fn((req: Request, res: Response, next: NextFunction) => {
      throw error;
    });

    const composed = composeMiddleware(middleware);
    await composed(mockReq as Request, mockRes as Response, mockNext);

    expect(middleware).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should skip middleware based on condition", async () => {
    const middleware = jest.fn((req: Request, res: Response, next: NextFunction) => next());
    const condition = jest.fn().mockReturnValue(false);

    const conditional = conditionalMiddleware(condition, middleware);
    await conditional(mockReq as Request, mockRes as Response, mockNext);

    expect(condition).toHaveBeenCalled();
    expect(middleware).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should handle path patterns correctly", async () => {
    const middleware = jest.fn((req: Request, res: Response, next: NextFunction) => next());
    const paths = ["/api/v1/*", "/health"];

    // Test matching paths
    const testPaths = [
      { path: "/api/v1/users", shouldMatch: true },
      { path: "/api/v1/posts", shouldMatch: true },
      { path: "/health", shouldMatch: true },
      { path: "/api/v2/users", shouldMatch: false },
      { path: "/healthcheck", shouldMatch: false },
    ];

    for (const testPath of testPaths) {
      // Create a new request object for each test
      const req = { path: testPath.path } as Request;
      const pathMw = pathMiddleware(paths, middleware);
      await pathMw(req, mockRes as Response, mockNext);

      if (testPath.shouldMatch) {
        expect(middleware).toHaveBeenCalled();
      } else {
        expect(middleware).not.toHaveBeenCalled();
      }
      middleware.mockClear();
      mockNext.mockClear();
    }
  });

  it("should handle async middleware", async () => {
    const middleware = jest.fn(async (req: Request, res: Response, next: NextFunction) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      next();
    });

    const composed = composeMiddleware(middleware);
    await composed(mockReq as Request, mockRes as Response, mockNext);

    expect(middleware).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should stop middleware chain on response", async () => {
    const middleware1 = jest.fn((req: Request, res: Response, next: NextFunction) => {
      res.status(200).json({ success: true });
    });
    const middleware2 = jest.fn((req: Request, res: Response, next: NextFunction) => next());

    const composed = composeMiddleware(middleware1, middleware2);
    await composed(mockReq as Request, mockRes as Response, mockNext);

    expect(middleware1).toHaveBeenCalled();
    expect(middleware2).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
  });
});
