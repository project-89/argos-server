import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/error";

type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void> | Response | Promise<Response | void>;

/**
 * Composes multiple middleware functions into a single middleware
 * Executes middleware in sequence and handles errors appropriately
 *
 * @example
 * // Basic usage
 * app.use(composeMiddleware(
 *   ipRateLimit(),
 *   fingerprintRateLimit()
 * ));
 *
 * @example
 * // With error handling
 * app.use(composeMiddleware(
 *   validateRequest(schema),
 *   requirePermission("admin")
 * ));
 */
export const composeMiddleware = (...middlewares: Middleware[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let isResponseSent = false;

      // Create a response wrapper with the same type as the original response
      const resWrapper = Object.create(res) as Response;

      // Add wrapped methods to detect response sending
      const wrappedMethods = ["json", "send", "end"] as const;
      wrappedMethods.forEach((method) => {
        const originalMethod = (res as any)[method];
        if (typeof originalMethod === "function") {
          (resWrapper as any)[method] = function (...args: any[]) {
            isResponseSent = true;
            return originalMethod.apply(res, args);
          };
        }
      });

      // Execute each middleware in sequence
      for (const middleware of middlewares) {
        if (isResponseSent) break;

        await new Promise<void>((resolve, reject) => {
          try {
            const middlewareResult = middleware(req, resWrapper, (err?: any) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });

            // Handle middleware that returns a Promise
            if (middlewareResult instanceof Promise) {
              middlewareResult.then(() => resolve()).catch(reject);
            } else {
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        });
      }

      // Only call next if no response was sent
      if (!isResponseSent) {
        next();
      }
    } catch (error) {
      // Handle ApiError instances directly
      if (error instanceof ApiError) {
        next(error);
        return;
      }
      // Convert other errors to ApiError
      next(new ApiError(500, error instanceof Error ? error.message : "Middleware error"));
    }
  };
};

/**
 * Creates a conditional middleware that only executes if the condition is met
 * @param condition Function that returns true if the middleware should be executed
 * @param middleware The middleware to execute conditionally
 */
export const conditionalMiddleware = (
  condition: (req: Request) => boolean,
  middleware: Middleware,
): Middleware => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return middleware(req, res, next);
    }
    next();
  };
};

/**
 * Creates a middleware that only executes for specific paths
 * @param paths Array of path patterns to match against
 * @param middleware The middleware to execute for matching paths
 */
export const pathMiddleware = (paths: string[], middleware: Middleware): Middleware => {
  return conditionalMiddleware(
    (req) =>
      paths.some((path) => {
        // Convert path pattern to regex
        const pattern = path
          .replace(/\*/g, ".*") // Convert * to .*
          .replace(/\//g, "\\/"); // Escape forward slashes
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(req.path);
      }),
    middleware,
  );
};
