# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/475073ef-ec99-4e93-8cb6-11a68a02f8d6

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/475073ef-ec99-4e93-8cb6-11a68a02f8d6) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Next.js (App Router)
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Migration notes (Vite -> Next.js)

I migrated the project from a Vite entry to Next.js. Changes made:

- Removed Vite entry files: `index.html`, `src/main.tsx`, and `src/App.tsx`.
- Kept the existing `app/` directory which already contains a Next.js App Router layout and pages.
- Updated `package.json` name and dev script to use Next.js.

Next steps after pulling these changes locally:

1. Run `npm install` to ensure Next.js and other dependencies are present.
2. Verify `tsconfig.json` and `next.config.js` (create/adjust if needed).
3. Start the dev server with `npm run dev` and open http://localhost:3000.
4. Remove any Vite-specific dependencies if you want to slim the project.

If you'd like, I can also:

- Add a minimal `next.config.js` and adjust `tsconfig.json` for Next.js compatibility.
- Run a local typecheck/lint and fix any issues.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/475073ef-ec99-4e93-8cb6-11a68a02f8d6) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
