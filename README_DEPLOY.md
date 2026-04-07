# Deploying Quotation Pro to Render.com

This application is configured for deployment on Render as a **Web Service**.

### Prerequisites
1.  A [Render.com](https://render.com) account.
2.  Your code pushed to a GitHub or GitLab repository.

### Important Note on Render Free Tier
Render's **Free Tier** for Web Services does not support persistent disks. This means:
*   **Data Loss**: Any data you save (quotations, users, products) will be **deleted** whenever the service restarts or redeploys.
*   **Recommendation**: For a production app, you should either:
    1.  **Upgrade to Render's "Starter" plan** (which supports persistent disks).
    2.  **Use an external database** like Render's PostgreSQL (free for 90 days) or Supabase.

### Deployment Steps (Free Tier)
1.  **Connect Repository**: In the Render Dashboard, click **New +** and select **Blueprint**.
2.  **Connect GitHub**: Connect your repository. Render will automatically detect the `render.yaml` file.
3.  **Configure Environment Variables**:
    *   `GEMINI_API_KEY`: Your Google Gemini API key.
    *   `SMTP_USER`: Your email address for sending OTPs.
    *   `SMTP_PASS`: Your email app password.
4.  **Deploy**: Click **Apply**. Render will start the build process.

### Build & Start Commands (Handled by render.yaml)
*   **Build Command**: `npm install && npm run build && npm run build:server`
*   **Start Command**: `npm start`

### Environment Variables
The following variables are pre-configured in `render.yaml` but require values in the Render Dashboard:
*   `GEMINI_API_KEY`
*   `SMTP_USER`
*   `SMTP_PASS`
*   `DB_PATH` (Set to `/var/data/quotations.db`)
*   `NODE_ENV` (Set to `production`)
