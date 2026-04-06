# Deploying Quotation Pro to Render.com

This application is configured for deployment on Render as a **Web Service**.

### Prerequisites
1.  A [Render.com](https://render.com) account.
2.  Your code pushed to a GitHub or GitLab repository.

### Deployment Steps

1.  **Connect Repository**: In the Render Dashboard, click **New +** and select **Blueprint**.
2.  **Connect GitHub**: Connect your repository. Render will automatically detect the `render.yaml` file.
3.  **Configure Environment Variables**:
    *   `GEMINI_API_KEY`: Your Google Gemini API key.
    *   `SMTP_USER`: Your email address for sending OTPs.
    *   `SMTP_PASS`: Your email app password.
4.  **Deploy**: Click **Apply**. Render will start the build process.

### Persistent Storage
The application uses a **Persistent Disk** (1GB) mounted at `/var/data` to store the SQLite database (`quotations.db`). This ensures your data (quotations, users, products) persists across redeploys and restarts.

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
