# Server Development Guide

This guide focuses on developing the Argos Server API. Most contributors will work primarily in this area.

## Local Development Setup

1. **Prerequisites**
   ```bash
   # Check Node.js version (18 or higher required)
   node --version

   # Install Firebase CLI globally
   npm install -g firebase-tools

   # Login to Firebase (needed for emulators)
   firebase login
   ```

2. **Environment Setup**
   ```bash
   # Copy environment template
   cp env/.env.development.template env/.env.development

   # Install dependencies
   npm install
   ```

3. **Firebase Emulators**
   ```bash
   # Start the emulators and API server
   npm run serve

   # The following services will be available:
   # - API:       http://localhost:5001
   # - Firestore: http://localhost:8080
   # - UI:        http://localhost:4000
   ```

## Project Structure

```
server/
├── src/                    # Source code
│   ├── constants/         # Constants and configuration
│   ├── endpoints/         # API endpoint handlers
│   ├── middleware/        # Express middleware
│   ├── routes/           # Route definitions
│   ├── schemas/          # Zod schemas for validation
│   ├── services/         # Business logic
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── config/               # Configuration files
│   ├── eslint/          # ESLint configuration
│   ├── jest/            # Jest configuration
│   └── typescript/      # TypeScript configuration
├── docs/                # Documentation
└── env/                 # Environment files
```

## Development Workflow

1. **Creating a New Endpoint**
   ```typescript
   // 1. Create schema in src/schemas
   // example: src/schemas/user.schema.ts
   export const createUserSchema = z.object({
     name: z.string(),
     email: z.string().email()
   });

   // 2. Create service in src/services
   // example: src/services/user.service.ts
   export const UserService = {
     async createUser(data: CreateUserInput) {
       // Implementation
     }
   }

   // 3. Create endpoint in src/endpoints
   // example: src/endpoints/user.endpoint.ts
   export const createUser = async (req: Request, res: Response) => {
     // Implementation
   }

   // 4. Add route in src/routes
   // example: src/routes/user.routes.ts
   router.post('/', validateRequest(createUserSchema), createUser);
   ```

2. **Testing**
   ```bash
   # Run all tests
   npm test

   # Run specific tests
   npm run test:single path/to/test

   # Watch mode for development
   npm run test:watch
   ```

3. **Code Style**
   ```bash
   # Lint code
   npm run lint

   # Auto-fix lint issues
   npm run lint -- --fix
   ```

## Testing

1. **Unit Tests**
   - Place in `__tests__` directories
   - Use `.test.ts` extension
   - Focus on isolated functionality

2. **Integration Tests**
   - Use Firebase Emulators
   - Test API endpoints
   - Test database interactions

3. **Test Environment**
   - Uses `env/.env.test`
   - Separate test database
   - Cleans up after tests

## Debugging

1. **Local Debugging**
   - Use VS Code debugger
   - Set breakpoints in TypeScript files
   - Debug configuration provided in `.vscode/launch.json`

2. **Emulator Debugging**
   ```bash
   # View emulator logs
   npm run logs

   # Clear emulator data
   firebase emulators:clear

   # Export emulator data
   firebase emulators:export ./data
   ```

3. **Common Issues**
   - Port conflicts: Use `npm run kill-ports`
   - Emulator connection: Check Firebase login
   - Type errors: Check `tsconfig.json`

## Best Practices

1. **Code Organization**
   - Follow the established project structure
   - Keep files focused and small
   - Use meaningful file names

2. **Error Handling**
   - Use custom error classes
   - Provide meaningful error messages
   - Handle async errors properly

3. **Type Safety**
   - Write proper TypeScript types
   - Use Zod for runtime validation
   - Avoid `any` type

4. **Performance**
   - Use database indexes
   - Implement proper caching
   - Optimize database queries

## Contributing

1. **Pull Request Process**
   - Create feature branch
   - Write tests
   - Update documentation
   - Follow code style
   - Get review

2. **Commit Messages**
   - Use conventional commits
   - Reference issues
   - Be descriptive

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Zod Documentation](https://zod.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/) 