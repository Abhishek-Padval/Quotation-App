# Deploying Quotation Pro to Render.com

This application is configured for deployment on Render as a **Web Service**.

### Prerequisites
1.  A [Render.com](https://render.com) account.
2.  Your code pushed to a GitHub or GitLab repository.

### Supabase Setup (Required)
1.  Create a free account on [Supabase](https://supabase.com).
2.  Create a new project.
3.  Go to **SQL Editor** and run the contents of `supabase_setup.sql` (found in the root of this project).
4.  Go to **Project Settings > API** and copy your **Project URL** and **anon public key**.

### Deployment Steps
1.  **Connect Repository**: In the Render Dashboard, click **New +** and select **Blueprint**.
2.  **Connect GitHub**: Connect your repository. Render will automatically detect the `render.yaml` file.
3.  **Configure Environment Variables**:
    *   `SUPABASE_URL`: Your Supabase Project URL.
    *   `SUPABASE_ANON_KEY`: Your Supabase anon public key.
    *   `GEMINI_API_KEY`: Your Google Gemini API key.
    *   `SMTP_USER`: Your email address for sending OTPs.
    *   `SMTP_PASS`: Your email app password.
4.  **Deploy**: Click **Apply**. Render will start the build process.

### Environment Variables
The following variables are pre-configured in `render.yaml` but require values in the Render Dashboard:
*   `SUPABASE_URL`
*   `SUPABASE_ANON_KEY`
*   `GEMINI_API_KEY`
*   `SMTP_USER`
*   `SMTP_PASS`
*   `NODE_ENV` (Set to `production`)
