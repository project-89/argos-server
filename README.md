# Argos Server

The Argos Server is an open-source API service designed to power and manage Alternate Reality Game (ARG) experiences. Built by Project89, it provides a robust backend for creating, managing, and orchestrating interactive narrative experiences that blur the line between fiction and reality.

## 🎮 Overview

Argos enables ARG creators and players to:
- Create and manage complex narrative experiences
- Track player interactions and progress
- Manage player fingerprinting and identity verification
- Orchestrate real-time game events and triggers
- Monitor and analyze player engagement
- Scale experiences from small groups to massive audiences

Built with Node.js, Express, and Firebase, and running on Google Cloud Platform, Argos provides the infrastructure needed to run sophisticated ARG experiences while maintaining player immersion and game integrity.

## 🚀 Quick Start for Contributors

Most contributors will want to focus on the API development in the `server` directory. Here's how to get started:

1. **Prerequisites**
   ```bash
   # Install Node.js 18 or higher
   node --version

   # Install Firebase CLI
   npm install -g firebase-tools

   # Login to Firebase (needed for emulators)
   firebase login
   ```

2. **Setup Project**
   ```bash
   # Clone the repository
   git clone https://github.com/project89/argos-server.git
   cd argos-server

   # Install dependencies
   npm install

   # Copy environment template
   cp server/env/.env.development.template server/env/.env.development
   ```

3. **Run Development Environment**
   ```bash
   # Start Firebase emulators and API server
   npm run serve
   ```

The API will be available at `http://localhost:5001` with Firebase emulators running locally.

## 🔧 Development Guides

The documentation is organized into two main locations:

1. `/docs/` - Repository-level documentation:
   - [System Architecture](docs/ARCHITECTURE.md) - Overview of core systems and data flows
   - [Infrastructure Guide](docs/INFRASTRUCTURE.md) - Setting up GCP and Terraform
   - [HiveMind Overview](docs/HIVEMIND.md) - High-level HiveMind concepts

2. `/server/docs/` - Server implementation documentation:
   - [Server Development Guide](server/docs/DEVELOPMENT.md) - Detailed guide for API development
   - [API Types Documentation](server/docs/HIVEMIND_TYPES.md) - API type definitions and schemas
   - [Server README](server/docs/README.md) - Server-specific setup and guidelines

## 🏗️ Infrastructure Setup

For core developers who need to work with the infrastructure:

- [Infrastructure Guide](docs/INFRASTRUCTURE.md) - Setting up GCP and Terraform
- [Deployment Guide](docs/DEPLOYMENT.md) - Deploying to production
- [Security Guide](docs/SECURITY.md) - Security best practices and configuration

## 📝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

- Create an issue for bug reports or feature requests
- Join our [Discord community](https://discord.gg/your-discord) for discussions
- Check out our [Documentation](https://docs.your-domain.com) for more details
