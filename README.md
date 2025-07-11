# FolioLab

![FolioLab](images/FolioLab.png)

FolioLab is an app that allows you to create a portfolio from your git repositories.

Create your portfolio using this link: https://foliolab.vercel.app/

## Features

- Turn your GitHub repositories into a beautiful portfolio in minutes
- Choose which projects to showcase
- Generate AI-powered descriptions for your projects
- Auto deploy to Vercel/GitHub Pages with a single click
- Update your portfolio as many times as you want
- 100% free and open source, self-hosted or on Vercel

## Tech Stack

- Next.js
- Tailwind CSS
- TypeScript
- Shadcn UI
- OpenAI API

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following:
```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
# OpenAI API Configuration (for AI-powered descriptions)
OPENAI_API_KEY=your_openai_api_key
# Optional: Custom OpenAI API base URL (e.g., for proxy or alternative endpoints)
OPENAI_API_BASE_URL=https://api.openai.com/v1
# Optional: Custom OpenAI model (defaults to gpt-4o)
OPENAI_API_MODEL=gpt-4o
```

To obtain GitHub OAuth credentials:
1. Go to GitHub Settings > Developer Settings > OAuth Apps
2. Create a new OAuth App
3. Set the Homepage URL to `http://localhost:5000`
4. Set the Authorization callback URL to `http://localhost:5000/auth/github`

4. Start the development server:
```bash
npm run dev
```

5. Visit `http://localhost:5000` in your browser

## OpenAI Configuration

FolioLab uses OpenAI's API to generate AI-powered descriptions for your repositories. You can customize the OpenAI configuration using the following environment variables:

### Required
- `OPENAI_API_KEY`: Your OpenAI API key

### Optional
- `OPENAI_API_BASE_URL`: Custom base URL for OpenAI API calls
  - Default: Uses OpenAI's default endpoint
  - Example: `https://your-proxy.com/` (for proxy servers or alternative endpoints)
  - Note: Should contain only the base URL, not the full endpoint path

- `OPENAI_API_MODEL`: The OpenAI model to use for generating descriptions
  - Default: `gpt-4o`
  - Examples: `gpt-4`, `gpt-3.5-turbo`, `gpt-4-turbo`

### Example Configuration
```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODEL=gpt-4o
```

### Option 2: Docker Deployment

1. Clone the repository:
```bash
git clone https://github.com/gojiplus/foliolab.git
cd foliolab
```

2. Create a `.env` file with your environment variables:
```env
GITHUB_CLIENT_ID=your_github_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key
# Optional: Custom OpenAI API base URL (e.g., for proxy or alternative endpoints)
OPENAI_API_BASE_URL=https://api.openai.com/v1
# Optional: Custom OpenAI model (defaults to gpt-4o)
OPENAI_API_MODEL=gpt-4o
```

3. Build and run with Docker Compose:
```bash
docker-compose up -d
```

The application will be available at `http://localhost:5000`

To stop the container:
```bash
docker-compose down
```

### Option 3: Deploy on Replit

1. Fork this repository to your GitHub account
2. Create a new Repl, importing from your forked repository
3. Set up the environment variables in Replit's Secrets tab
4. Click "Run" to start the application

### Option 4: Deploy Anywhere

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start