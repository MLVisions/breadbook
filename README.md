# Breadbook

A private-by-default bread journal with optional ingredient costing, sales snapshots, and progress tools. It runs entirely in the browser and needs no application server, account, database, or API key.

Open **Setup** inside the app to choose between a simple Bread Journal, Baker + Costs, or Small Business view. Hidden features keep their data and can be restored at any time.

## Publish on GitHub Pages

1. Create an empty GitHub repository and upload this project.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Push to `main`. The included workflow publishes the `dist/` directory.

## Data and privacy

Bakes are stored in the current browser using `localStorage`. Use **Data → Download backup** regularly. On Chrome or Edge, **Connect JSON file** can also save the journal to a file chosen by the user. Browsers cannot silently write to paths such as `~/.config/bread_notes`.

The app works offline after its first successful visit. Clearing browser site data removes the browser copy, so JSON backups matter.

## Run locally

Serve the `dist/` folder with any static file server. For example:

```bash
python3 -m http.server 8000 --directory dist
```

Then open <http://localhost:8000>.
